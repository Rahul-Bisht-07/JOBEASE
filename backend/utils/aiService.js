const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ─── CACHE SETUP ────────────────────────────────────────────────────────────────
// In-memory map + persistent JSON file so cache survives server restarts
const CACHE_FILE = path.join(__dirname, '..', '.ai_cache.json');
let cache = {};

try {
  if (fs.existsSync(CACHE_FILE)) {
    cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    console.log(`[AI Cache] Loaded ${Object.keys(cache).length} cached answers from disk.`);
  }
} catch {
  cache = {};
}

function saveCache() {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.error('[AI Cache] Failed to persist cache:', err.message);
  }
}

/**
 * Generate a cache key from the question + input type.
 * We normalize whitespace and lowercase to catch near-duplicates
 * like "What is your CTC?" vs " what is your ctc ?"
 */
function getCacheKey(questionText, inputType, options) {
  const normalized = questionText.replace(/\s+/g, ' ').trim().toLowerCase();
  const raw = `${normalized}|${inputType}|${JSON.stringify(options || [])}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

// ─── TIER 0: DIRECT PROFILE MATCH (Zero cost, instant) ─────────────────────────
// Maps common recruiter question keywords → botProfile field names.
// If a question contains any of these keywords, we return the profile value
// directly WITHOUT calling any AI API.

const KEYWORD_MAP = [
  // CTC & Salary
  { keywords: ['current ctc', 'present ctc', 'current salary', 'present salary', 'current annual', 'ctc in lacs', 'ctc in lakhs', 'annual ctc'], field: 'currentCTC', action: 'type' },
  { keywords: ['expected ctc', 'expected salary', 'desired ctc', 'desired salary', 'salary expectation'], field: 'expectedCTC', action: 'type' },

  // Notice Period & Availability
  { keywords: ['notice period', 'serving notice'], field: 'noticePeriod', action: 'type' },
  { keywords: ['how soon can you join', 'join in', 'joining date', 'earliest joining', 'days to join', 'when can you join'], field: 'joinInDays', action: 'type' },

  // Experience (only match TOTAL experience — NOT "experience in X" which is skill-specific)
  // "experience in Python/React/ML" will be handled by the skill matcher instead
  { keywords: ['total experience', 'overall experience', 'total work experience'], field: 'totalExperience', action: 'type' },

  // Location & Relocation
  { keywords: ['current location', 'present location', 'current city', 'where are you based', 'residing in'], field: 'currentLocation', action: 'type' },
  { keywords: ['willing to relocate', 'relocate', 'relocation', 'open to relocation'], field: 'willingToRelocate', action: 'type' },
  { keywords: ['work mode', 'preferred work mode', 'wfh', 'wfo', 'hybrid', 'remote or office', 'work from'], field: 'workModePreferences', action: 'type' },

  // Education
  { keywords: ['highest qualification', 'highest degree', 'educational qualification', 'qualification'], field: 'highestQualification', action: 'type' },
  { keywords: ['graduation year', 'year of graduation', 'passing year', 'year of passing', 'passout year', 'pass out year'], field: 'graduationYear', action: 'type' },
  { keywords: ['cgpa', 'percentage', 'gpa', 'marks', 'aggregate'], field: 'cgpaPercentage', action: 'type' },

  // Skills & Languages
  { keywords: ['skills', 'proficiency', 'rate your', 'skill set', 'technologies you know', 'tech stack'], field: 'skillsProficiency', action: 'type' },
  { keywords: ['languages known', 'languages you speak', 'languages spoken', 'communication language', 'spoken language', 'which language do you speak', 'what languages'], field: 'languages', action: 'type' },

  // Personal / Eligibility
  { keywords: ['fresher', 'experienced', 'are you a fresher'], field: 'fresherOrExperienced', action: 'type' },
  { keywords: ['night shift', 'rotational shift', 'shift', 'comfortable with shift'], field: 'shiftsOk', action: 'type' },
  { keywords: ['bond', 'service agreement', 'bond agreement'], field: 'bondOk', action: 'type' },
  { keywords: ['laptop', 'computer', 'pc and internet', 'have a laptop'], field: 'hasLaptop', action: 'type' },
  { keywords: ['two wheeler', 'two-wheeler', 'vehicle', 'own vehicle', 'bike'], field: 'hasVehicle', action: 'type' },
  { keywords: ['field work', 'travel', 'travelling', 'comfortable with travel', 'field job'], field: 'fieldWorkOk', action: 'type' },
  { keywords: ['target based', 'target-based', 'target driven'], field: 'targetBasedOk', action: 'type' },
  { keywords: ['sales', 'marketing', 'support', 'sales experience', 'bpo', 'customer service'], field: 'salesSupportExp', action: 'type' },
  { keywords: ['international client', 'us client', 'uk client', 'global client'], field: 'intlClientExp', action: 'type' },
  { keywords: ['domain', 'worked on domain', 'industry experience'], field: 'workedOnDomain', action: 'type' },

  // Profile / Intro
  { keywords: ['headline', 'profile headline', 'professional headline'], field: 'profileHeadline', action: 'type' },
  { keywords: ['about yourself', 'summary', 'describe yourself', 'introduce yourself', 'tell us about'], field: 'summary', action: 'type' },

  // Common-sense questions — always answer "Yes" (no profile field needed)
  { keywords: ['hike', 'salary hike', 'salary increase', 'ok for', 'ok with', 'are you ok', 'are you okay', 'interested in this'], field: '_alwaysYes', action: 'type' },
];

/**
 * Parse the user's skillsProficiency string to extract individual skill → experience mappings.
 * Input format: "React (1 yr), Python (2 yrs), Node (1 yr), C++ (3 yrs)"
 * Returns: { react: "1", python: "2", node: "1", "c++": "3" }
 */
function parseSkillExperience(skillsString) {
  if (!skillsString || typeof skillsString !== 'string') return {};

  const map = {};
  // Match patterns like: "React (1 yr)" or "Python (2 yrs)" or "C++ (3 years)" or "Node(1yr)"
  const regex = /([a-zA-Z0-9#+.\-\s]+?)\s*\(\s*(\d+)\s*(?:yr|yrs|year|years)?\s*\)/gi;
  let match;

  while ((match = regex.exec(skillsString)) !== null) {
    const skill = match[1].trim().toLowerCase();
    const years = match[2];
    map[skill] = years;
  }

  return map;
}

/**
 * Check if the recruiter is asking about experience with a SPECIFIC skill.
 * e.g., "How many years of experience do you have in Python?" → finds "python" → returns "2"
 * e.g., "Rate your proficiency in React" → finds "react" → returns "1"
 */
function matchSkillExperience(botProfile, questionText) {
  const skills = parseSkillExperience(botProfile.skillsProficiency);
  if (Object.keys(skills).length === 0) return null;

  const q = questionText.replace(/\s+/g, ' ').trim().toLowerCase();

  // Common patterns: "experience in X", "proficiency in X", "how many years X", "rate X"
  for (const [skill, years] of Object.entries(skills)) {
    if (q.includes(skill)) {
      // Check if the question is about experience/years specifically
      const isExpQuestion = /experience|years|how many|how long|proficien|expertise|knowledge|worked with|working with|familiar/i.test(q);
      if (isExpQuestion) {
        console.log(`[AI] 🎯 Skill Match! Question about "${skill}" → ${years} years`);
        return { action: 'type', value: years };
      }
    }
  }

  return null;
}

/**
 * Try to match the recruiter's question directly against the user's botProfile.
 * Returns { action, value } if a match is found, or null if no match.
 */
function matchProfileDirectly(botProfile, questionText, inputType, options) {
  if (!botProfile || typeof botProfile !== 'object') return null;

  const q = questionText.replace(/\s+/g, ' ').trim().toLowerCase();

  // ── SKILL-SPECIFIC EXPERIENCE CHECK (highest priority) ──
  // e.g. "How many years of experience in Python?" → "2"
  const skillMatch = matchSkillExperience(botProfile, q);
  if (skillMatch) return skillMatch;

  // ── COMMON-SENSE CHECK (always "Yes" questions like hike, salary increase) ──
  const alwaysYesMapping = KEYWORD_MAP.find(m => m.field === '_alwaysYes');
  if (alwaysYesMapping && alwaysYesMapping.keywords.some(kw => q.includes(kw))) {
    if (inputType === 'radio' && options.length > 0) {
      // Pick the "Yes" option from the available radio buttons
      const yesOpt = options.find(opt => /^yes$/i.test(opt.trim()));
      if (yesOpt) return { action: 'select', value: yesOpt.trim() };
    }
    return { action: 'type', value: 'Yes' };
  }

  // For radio/select inputs, check if any option text matches a profile value
  if (inputType === 'radio' && options.length > 0) {
    for (const mapping of KEYWORD_MAP) {
      if (mapping.field === '_alwaysYes') continue; // Already handled above
      const matched = mapping.keywords.some(kw => q.includes(kw));
      if (!matched) continue;

      const profileValue = botProfile[mapping.field];
      if (!profileValue) continue;

      const pv = String(profileValue).trim().toLowerCase();
      // Check if any option matches or contains the profile value
      for (const opt of options) {
        const optLower = opt.trim().toLowerCase();
        if (optLower === pv || optLower.includes(pv) || pv.includes(optLower)) {
          return { action: 'select', value: opt.trim() };
        }
      }
    }
    return null; // Can't confidently pick a radio option — let AI handle it
  }

  // For text inputs, do a keyword scan
  for (const mapping of KEYWORD_MAP) {
    if (mapping.field === '_alwaysYes') continue; // Already handled above
    const matched = mapping.keywords.some(kw => q.includes(kw));
    if (!matched) continue;

    const profileValue = botProfile[mapping.field];
    if (profileValue && String(profileValue).trim() !== '') {
      return { action: 'type', value: String(profileValue).trim() };
    }
  }

  return null; // No direct match found — hand off to AI
}


// ─── PROMPT BUILDER ─────────────────────────────────────────────────────────────
function buildPrompt(botProfile, questionText, inputType, options) {
  return `You are an AI assisting an applicant in filling out a job application chatbot.
User Profile Data:
${JSON.stringify(botProfile, null, 2)}

The recruiter chatbot asked this question:
"${questionText}"

Input Type: ${inputType} // "text" or "radio"
Available Options (if any): ${JSON.stringify(options)}

Instructions:
Look at the User Profile Data. Try to find the closest match.
If it is a "radio" input, you MUST pick exactly one of the Available Options that best matches.
If it is a "text" input, you must provide a concise text answer (e.g., "5", "Yes", "WFO", "10 Lakhs").

Respond ONLY with a valid JSON object in the following format, with no markdown formatting:
{
  "action": "type" | "select",
  "value": "string of what to type or the exact option text to select"
}`;
}

/**
 * Parse the raw LLM response string into a clean JSON object.
 */
function parseResponse(responseText) {
  const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

// ─── TIER 2: GROQ (Primary API) ────────────────────────────────────────────────
async function askGroq(botProfile, questionText, inputType, options) {
  if (!process.env.GROQ_API_KEY || process.env.GROQ_API_KEY === '') {
    console.log('[AI] Groq API key not set, skipping Groq.');
    return null;
  }

  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const prompt = buildPrompt(botProfile, questionText, inputType, options);

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 256,
    });

    const text = chatCompletion.choices[0]?.message?.content;
    if (!text) throw new Error('Empty Groq response');

    const decision = parseResponse(text);
    console.log('[AI] ✅ Groq (Llama 3.3) answered successfully.');
    return decision;
  } catch (error) {
    console.warn('[AI] ⚠️ Groq failed:', error.message);
    return null;
  }
}

// ─── TIER 3: GEMINI (Last Resort Fallback) ──────────────────────────────────────
async function askGemini(botProfile, questionText, inputType, options) {
  if (!process.env.GEMINI_API_KEY) {
    console.log('[AI] Gemini API key not set, skipping Gemini.');
    return null;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const prompt = buildPrompt(botProfile, questionText, inputType, options);

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const decision = parseResponse(text);
    console.log('[AI] ✅ Gemini answered successfully (last resort fallback).');
    return decision;
  } catch (error) {
    console.warn('[AI] ⚠️ Gemini failed:', error.message);
    return null;
  }
}

// ─── MAIN ENTRY POINT: Profile Match → Cache → Groq → Gemini ───────────────────
/**
 * askAI() — The 4-tier intelligent chatbot answering system.
 *
 * Priority Order:
 *   0. Profile Match — Instant keyword lookup against botProfile (FREE, no API)
 *   1. Cache         — Previously answered questions stored on disk (FREE)
 *   2. Groq          — Primary API (Llama 3.3 70B, generous free tier)
 *   3. Gemini        — Last resort fallback (Google Gemini 2.5 Flash)
 *
 * @param {Object} botProfile - The user's full AI profile from MongoDB
 * @param {string} questionText - The recruiter's question scraped from the DOM
 * @param {string} inputType - "text" or "radio"
 * @param {string[]} options - Available radio options (if any)
 * @returns {Object|null} - { action: "type"|"select", value: "..." } or null
 */
async function askAI(botProfile, questionText, inputType, options = []) {

  // ── TIER 0: DIRECT PROFILE MATCH (instant, free) ──
  const profileMatch = matchProfileDirectly(botProfile, questionText, inputType, options);
  if (profileMatch) {
    console.log(`[AI] 🎯 Profile Match! "${questionText.substring(0, 60)}..." → "${profileMatch.value}" (ZERO API cost)`);
    return profileMatch;
  }

  const key = getCacheKey(questionText, inputType, options);

  // ── TIER 1: CACHE ──
  if (cache[key]) {
    console.log(`[AI] 💾 Cache HIT — returning stored answer for: "${questionText.substring(0, 60)}..."`);
    return cache[key];
  }
  console.log(`[AI] 🔍 No profile match or cache hit — querying AI providers...`);

  // ── TIER 2: GROQ ──
  let decision = await askGroq(botProfile, questionText, inputType, options);

  // ── TIER 3: GEMINI ──
  if (!decision) {
    console.log('[AI] 🔄 Falling back to Gemini...');
    decision = await askGemini(botProfile, questionText, inputType, options);
  }

  // ── STORE IN CACHE ──
  if (decision) {
    cache[key] = decision;
    saveCache();
    console.log(`[AI] 💾 Cached answer for future use.`);
  }

  return decision;
}

module.exports = { askAI };
