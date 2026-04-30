const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

// ─── Word Lists ────────────────────────────────────────────────
// Updated pdf-parse dependency

const ACTION_VERBS = [
  'achieved', 'administered', 'analyzed', 'architected', 'automated',
  'built', 'collaborated', 'conducted', 'consolidated', 'created',
  'decreased', 'delivered', 'designed', 'developed', 'directed',
  'drove', 'eliminated', 'engineered', 'established', 'executed',
  'expanded', 'generated', 'grew', 'headed', 'implemented',
  'improved', 'increased', 'initiated', 'integrated', 'launched',
  'led', 'managed', 'mentored', 'modernized', 'negotiated',
  'optimized', 'orchestrated', 'overhauled', 'pioneered', 'planned',
  'produced', 'reduced', 'refactored', 'resolved', 'revamped',
  'scaled', 'secured', 'simplified', 'spearheaded', 'streamlined',
  'supervised', 'trained', 'transformed', 'upgraded',
];

const SKILL_KEYWORDS = [
  // Programming
  'javascript', 'typescript', 'python', 'java', 'c\\+\\+', 'c#', 'ruby',
  'go', 'golang', 'rust', 'php', 'swift', 'kotlin', 'scala',
  // Web
  'react', 'angular', 'vue', 'next\\.js', 'node\\.js', 'express',
  'html', 'css', 'sass', 'tailwind', 'bootstrap', 'django', 'flask',
  'spring', 'asp\\.net',
  // Data
  'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'firebase',
  'elasticsearch', 'graphql',
  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'ci/cd',
  'terraform', 'linux', 'git', 'github',
  // Data Science / ML
  'machine learning', 'deep learning', 'tensorflow', 'pytorch',
  'pandas', 'numpy', 'data analysis', 'tableau', 'power bi',
  // General
  'agile', 'scrum', 'jira', 'figma', 'photoshop', 'excel',
  'project management', 'communication', 'leadership', 'teamwork',
  'problem solving', 'rest api', 'microservices',
];

const RED_FLAG_PHRASES = [
  'references available',
  'responsible for',
  'duties included',
  'duties include',
  'salary negotiable',
  'willing to learn',
  'hard worker',
  'team player',              // vague, no proof
  'detail oriented',          // overused cliché
  'self-motivated',           // overused cliché
];

const SECTION_HEADINGS = {
  experience: ['experience', 'work experience', 'work history', 'employment', 'professional experience'],
  education:  ['education', 'academic', 'qualification', 'qualifications', 'degree'],
  skills:     ['skills', 'technical skills', 'core competencies', 'competencies', 'technologies'],
  summary:    ['summary', 'objective', 'profile', 'about me', 'professional summary', 'career objective'],
  projects:   ['projects', 'personal projects', 'academic projects', 'key projects'],
};

// ─── Text Extraction ───────────────────────────────────────────

/**
 * Extract plain text from a resume file (PDF or DOCX).
 * @param {string} filePath – absolute path to the uploaded file
 * @returns {Promise<string>} extracted text
 */
async function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.pdf') {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  if (ext === '.docx') {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value || '';
  }

  if (ext === '.doc') {
    // .doc (legacy Word) isn't easily parseable without native binaries.
    // Return empty so the scorer gives a low but non-zero baseline score.
    return '';
  }

  return '';
}

// ─── Individual Scoring Functions ──────────────────────────────

function scoreContactInfo(text) {
  let score = 0;
  const details = [];

  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  if (emailRegex.test(text)) {
    score += 8;
    details.push('Email found');
  } else {
    details.push('No email address detected');
  }

  const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/;
  if (phoneRegex.test(text)) {
    score += 7;
    details.push('Phone number found');
  } else {
    details.push('No phone number detected');
  }

  return { score, max: 15, details };
}

function scoreSections(text) {
  let score = 0;
  const details = [];
  const lowerText = text.toLowerCase();

  const checks = [
    { key: 'experience', label: 'Experience / Work History', pts: 5 },
    { key: 'education',  label: 'Education',                pts: 5 },
    { key: 'skills',     label: 'Skills',                   pts: 5 },
    { key: 'summary',    label: 'Summary / Objective',      pts: 3 },
    { key: 'projects',   label: 'Projects',                 pts: 2 },
  ];

  for (const check of checks) {
    const found = SECTION_HEADINGS[check.key].some((h) => lowerText.includes(h));
    if (found) {
      score += check.pts;
      details.push(`${check.label} section found`);
    } else {
      details.push(`${check.label} section missing`);
    }
  }

  return { score, max: 20, details };
}

function scoreLength(text) {
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  let score = 0;
  const details = [`Word count: ${wordCount}`];

  if (wordCount >= 300 && wordCount <= 1500) {
    score = 10;
    details.push('Good length — concise and complete');
  } else if (wordCount >= 150 && wordCount < 300) {
    score = 6;
    details.push('A bit short — consider adding more detail');
  } else if (wordCount > 1500 && wordCount <= 2500) {
    score = 6;
    details.push('Slightly long — try trimming to 1–2 pages');
  } else if (wordCount < 150) {
    score = 2;
    details.push('Very short — resume may appear incomplete');
  } else {
    score = 3;
    details.push('Too long — ATS may penalize excessive length');
  }

  return { score, max: 10, details };
}

function scoreBulletPoints(text) {
  const lines = text.split('\n');
  const bulletCount = lines.filter((l) => /^\s*[•\-\*►●○■]/.test(l)).length;

  let score = 0;
  const details = [`${bulletCount} bullet points detected`];

  if (bulletCount >= 10) {
    score = 10;
    details.push('Great use of bullet points');
  } else if (bulletCount >= 6) {
    score = 7;
    details.push('Good — a few more bullet points would help');
  } else if (bulletCount >= 3) {
    score = 4;
    details.push('Consider using more bullet points for clarity');
  } else {
    score = 1;
    details.push('Very few bullets — use them to list achievements');
  }

  return { score, max: 10, details };
}

function scoreActionVerbs(text) {
  const lowerText = text.toLowerCase();
  const found = ACTION_VERBS.filter((v) => {
    const regex = new RegExp(`\\b${v}\\b`, 'i');
    return regex.test(lowerText);
  });

  let score = 0;
  const details = [`${found.length} action verbs found`];

  if (found.length >= 10) {
    score = 15;
    details.push('Excellent — strong, results-oriented language');
  } else if (found.length >= 6) {
    score = 11;
    details.push('Good verb usage');
  } else if (found.length >= 3) {
    score = 7;
    details.push('Try using more strong verbs like Led, Built, Optimized');
  } else {
    score = 3;
    details.push('Weak verb usage — avoid "Responsible for", use "Developed", "Managed"');
  }

  if (found.length > 0) {
    details.push(`Examples: ${found.slice(0, 5).join(', ')}`);
  }

  return { score, max: 15, details };
}

function scoreMeasurableResults(text) {
  let count = 0;

  // Percentages: 30%, 2.5%
  const percentages = text.match(/\d+(\.\d+)?%/g);
  if (percentages) count += percentages.length;

  // Currency: $50K, ₹10L, $2M
  const currency = text.match(/[$₹€£]\s?\d+/g);
  if (currency) count += currency.length;

  // Metrics with context: "10 team members", "5+ years", "100 clients"
  const metrics = text.match(/\d+\+?\s*(years?|months?|clients?|projects?|team|people|members|customers?|users?|employees?)/gi);
  if (metrics) count += metrics.length;

  let score = 0;
  const details = [`${count} quantifiable results found`];

  if (count >= 6) {
    score = 15;
    details.push('Excellent — strong data-driven achievements');
  } else if (count >= 4) {
    score = 11;
    details.push('Good — keep quantifying your impact');
  } else if (count >= 2) {
    score = 7;
    details.push('Add more numbers (%, $, team sizes) to stand out');
  } else {
    score = 2;
    details.push('Very few metrics — e.g., "Increased sales by 30%"');
  }

  return { score, max: 15, details };
}

function scoreSkillKeywords(text) {
  const lowerText = text.toLowerCase();
  const found = SKILL_KEYWORDS.filter((kw) => {
    const regex = new RegExp(`\\b${kw}\\b`, 'i');
    return regex.test(lowerText);
  });

  let score = 0;
  const details = [`${found.length} skill keywords found`];

  if (found.length >= 10) {
    score = 10;
    details.push('Strong keyword coverage');
  } else if (found.length >= 6) {
    score = 7;
    details.push('Good, but adding more specific skills helps');
  } else if (found.length >= 3) {
    score = 4;
    details.push('Add key technologies and tools you know');
  } else {
    score = 1;
    details.push('Very few recognized skills — list tools, languages, frameworks');
  }

  if (found.length > 0) {
    details.push(`Found: ${found.slice(0, 8).join(', ')}`);
  }

  return { score, max: 10, details };
}

function scoreRedFlags(text) {
  const lowerText = text.toLowerCase();
  const flagsFound = RED_FLAG_PHRASES.filter((phrase) => lowerText.includes(phrase));

  let score;
  const details = [];

  if (flagsFound.length === 0) {
    score = 5;
    details.push('No red-flag phrases detected');
  } else if (flagsFound.length <= 2) {
    score = 3;
    details.push(`Found: "${flagsFound.join('", "')}"`);
    details.push('Consider rephrasing these with specific achievements');
  } else {
    score = 1;
    details.push(`Found ${flagsFound.length} weak phrases`);
    details.push(`Including: "${flagsFound.slice(0, 3).join('", "')}"`);
  }

  return { score, max: 5, details };
}

// ─── Main Scorer ───────────────────────────────────────────────

/**
 * Analyse a resume file and return a score + category breakdown.
 * @param {string} filePath – absolute path to uploaded PDF/DOCX
 * @returns {Promise<object>} { overall, breakdown, analyzedAt }
 */
async function analyzeResume(filePath) {
  const text = await extractText(filePath);

  if (!text || text.trim().length < 20) {
    return {
      overall: 0,
      breakdown: {
        contactInfo:       { score: 0, max: 15, details: ['Could not extract text from file'] },
        sections:          { score: 0, max: 20, details: ['Could not extract text from file'] },
        length:            { score: 0, max: 10, details: ['Could not extract text from file'] },
        bulletPoints:      { score: 0, max: 10, details: ['Could not extract text from file'] },
        actionVerbs:       { score: 0, max: 15, details: ['Could not extract text from file'] },
        measurableResults: { score: 0, max: 15, details: ['Could not extract text from file'] },
        skills:            { score: 0, max: 10, details: ['Could not extract text from file'] },
        redFlags:          { score: 0, max: 5,  details: ['Could not extract text from file'] },
      },
      analyzedAt: new Date(),
    };
  }

  const contactInfo       = scoreContactInfo(text);
  const sections          = scoreSections(text);
  const length            = scoreLength(text);
  const bulletPoints      = scoreBulletPoints(text);
  const actionVerbs       = scoreActionVerbs(text);
  const measurableResults = scoreMeasurableResults(text);
  const skills            = scoreSkillKeywords(text);
  const redFlags          = scoreRedFlags(text);

  const overall =
    contactInfo.score +
    sections.score +
    length.score +
    bulletPoints.score +
    actionVerbs.score +
    measurableResults.score +
    skills.score +
    redFlags.score;

  return {
    overall,
    breakdown: {
      contactInfo,
      sections,
      length,
      bulletPoints,
      actionVerbs,
      measurableResults,
      skills,
      redFlags,
    },
    analyzedAt: new Date(),
  };
}

module.exports = { analyzeResume, extractText };
