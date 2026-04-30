const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { GoogleGenerativeAI } = require('@google/generative-ai');

puppeteerExtra.use(StealthPlugin());

/**
 * Small human-like delay
 */
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const humanDelay = () => delay(800 + Math.random() * 1200);

/**
 * Query Gemini to answer chatbot questions based on user's profile
 */
async function askGeminiChatbot(botProfile, questionText, inputType, options = []) {
  if (!process.env.GEMINI_API_KEY) {
    console.error('[Gemini] GEMINI_API_KEY not set.');
    return null;
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

  const prompt = `
You are an AI assisting an applicant in filling out a job application chatbot.
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
}
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonStr = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('[Gemini API Error]', error.message);
    return null;
  }
}

/**
 * Launch a stealth browser
 */
async function launchBrowser() {
  return puppeteerExtra.launch({
    headless: false, // Turned off headless so you can watch it!
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--window-size=1366,768',
    ],
    defaultViewport: { width: 1366, height: 768 },
  });
}

/**
 * Create a page with session cookies pre-loaded (no login needed).
 * `cookies` is an array of cookie objects: { name, value, domain, path, ... }
 */
async function createSessionPage(browser, cookies) {
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  );

  // Set all session cookies
  const formattedCookies = cookies.map(c => ({
    name: c.name,
    value: c.value,
    domain: c.domain || '.naukri.com',
    path: c.path || '/',
    httpOnly: c.httpOnly ?? false,
    secure: c.secure ?? true,
    sameSite: c.sameSite || 'Lax',
  }));

  await page.setCookie(...formattedCookies);

  // Navigate to Naukri to verify session is alive
  await page.goto('https://www.naukri.com/mnjuser/homepage', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  await delay(2000);

  // Check if we're redirected to login page (= session expired)
  const currentUrl = page.url();
  if (currentUrl.includes('nlogin') || currentUrl.includes('login')) {
    throw new Error('SESSION_EXPIRED');
  }

  console.log('[Naukri Applier] Session cookies loaded — logged in');
  return page;
}

/**
 * Apply to a single Naukri job URL.
 * Returns { success, status, message }
 */
async function applyToJob(page, jobUrl, botProfile) {
  console.log(`[Naukri Applier] Applying to: ${jobUrl}`);

  try {
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await delay(2000);

    // Check if already applied
    const alreadyApplied = await page.$('.already-applied, [class*="already"], #already-applied')
      .then(el => !!el).catch(() => false);
    if (alreadyApplied) {
      return { success: true, status: 'already_applied', message: 'Already applied on Naukri' };
    }

    // Look for apply button
    const applySelectors = [
      'button#apply-button',
      'button.apply-button',
      'button[class*="apply"]',
      'a[class*="apply"]',
      '.apply-btn-container button',
      '#applyBtn',
    ];

    let applyBtn = null;
    for (const sel of applySelectors) {
      applyBtn = await page.$(sel);
      if (applyBtn) break;
    }

    if (!applyBtn) {
      return { success: false, status: 'external', message: 'No direct apply button — may redirect externally' };
    }

    await humanDelay();
    await applyBtn.click();
    await delay(3000);

    // Chatbot Interaction Loop
    let chatbotAttempt = 0;
    while (chatbotAttempt < 10) {
      chatbotAttempt++;
      await delay(2000);

      // 1. Check for CAPTCHA
      const hasCaptcha = await page.$('iframe[src*="captcha"], .g-recaptcha').then(el => !!el).catch(() => false);
      if (hasCaptcha) {
        return { success: false, status: 'captcha', message: 'CAPTCHA required — cannot auto-apply' };
      }

      // 2. Check for Chatbot Modal
      const chatbotModal = await page.$('.chatbot_Drawer, .botwrap, [class*="chatbot"], [class*="chat-window"], [class*="chat-container"]');
      
      let textInput = null;
      let radioLabels = [];

      if (chatbotModal) {
        textInput = await chatbotModal.$('div[contenteditable="true"], input[type="text"], input[type="number"], textarea, input:not([type="hidden"])');
        radioLabels = await chatbotModal.$$('label, .chip, [role="button"], li');
      } else {
        textInput = await page.$('div[contenteditable="true"], .botwrap input[type="text"], input[placeholder*="message" i], textarea[placeholder*="message" i]');
        radioLabels = await page.$$('.botwrap label, .botwrap .chip, .botwrap [role="button"], [class*="chatbot"] li, [class*="chat-"] li');
      }

      if (!textInput && radioLabels.length === 0 && !chatbotModal) {
        // No Chatbot detected. Let's check if we succeeded!
        const successEl = await page.$('.apply-status-header, .success-message, .apply-message, .apply-success, .applied-successfully').then(el => !!el).catch(() => false);
        const successText = await page.evaluate(() => {
          return document.body.innerText.toLowerCase().includes('successfully applied') ||
                 document.body.innerText.toLowerCase().includes('applied successfully');
        });
        const newUrl = page.url();
        if (successEl || successText || newUrl.includes('applied') || newUrl.includes('success')) {
          return { success: true, status: 'applied', message: 'Application submitted successfully' };
        }
        break; // Break the loop, assume optimistic success
      }

      // We are in a chatbot! Extract the entire chat context
      const chatContextText = await page.evaluate((modal) => {
        if (modal) return modal.innerText;
        const input = document.querySelector('input[placeholder*="message" i], textarea[placeholder*="message" i]');
        if (input) {
          let parent = input.parentElement;
          for (let i = 0; i < 6; i++) {
            if (parent.parentElement && parent.parentElement !== document.body) parent = parent.parentElement;
          }
          return parent.innerText;
        }
        return 'Unknown Question';
      }, chatbotModal);

      let inputType = 'unknown';
      let options = [];

      if (textInput) {
        inputType = 'text';
      } else if (radioLabels.length > 0) {
        inputType = 'radio';
        for (const label of radioLabels) {
          options.push(await page.evaluate(el => el.innerText, label));
        }
      }

      console.log(`[Chatbot] Context: "${chatContextText.substring(0, 100)}..." | Type: ${inputType} | Opts:`, options);

      const geminiDecision = await askGeminiChatbot(botProfile, chatContextText, inputType, options);
      if (!geminiDecision) {
        console.log('[Chatbot] Gemini could not decide, skipping.');
        return { success: false, status: 'failed', message: 'Failed to answer chatbot question automatically' };
      }

      console.log(`[Chatbot] Gemini decided to ${geminiDecision.action}: ${geminiDecision.value}`);

      if (geminiDecision.action === 'type' && textInput) {
        // Focus and clear input (handles both inputs and contenteditable divs)
        await page.evaluate((el) => {
          el.innerText = '';
          el.value = '';
          el.focus();
        }, textInput);
        
        await textInput.type(String(geminiDecision.value), { delay: 50 });
      } else if (geminiDecision.action === 'select' && radioLabels.length > 0) {
        let clicked = false;
        for (const label of radioLabels) {
          const text = await page.evaluate(el => el.innerText, label);
          if (text.trim() === geminiDecision.value.trim()) {
            await label.click();
            clicked = true;
            break;
          }
        }
        if (!clicked) await radioLabels[0].click(); // fallback
      }

      // Submit the answer
      if (textInput) {
        await textInput.press('Enter');
        await delay(500); // Give it half a second to react
      }

      // Force-click the Send button via JS (bypasses Puppeteer click restrictions)
      await page.evaluate(() => {
        const sendBtns = document.querySelectorAll('.botwrap button[type="submit"], button[aria-label*="send" i], [class*="send-icon"], [class*="add-icon"]:not(.d-none), span.chatBot-add-round:not(.d-none), [class*="submit"], .chatbot_SendMessageContainer span');
        for (const btn of sendBtns) {
          const style = window.getComputedStyle(btn);
          // Only click if it's actually visible and clickable
          if (style.display !== 'none' && style.pointerEvents !== 'none' && !btn.className.includes('d-none')) {
            btn.click();
          }
        }
      });

      await delay(3000); // Wait for next question or success
    }

    // Optimistic fallback
    return { success: true, status: 'applied', message: 'Apply action triggered (optimistic)' };

  } catch (err) {
    return { success: false, status: 'failed', message: err.message };
  }
}

/**
 * Apply to a batch of jobs using session cookies.
 * cookies: decrypted array of cookie objects
 * jobs: array of { jobUrl, jobTitle, company, applicationId }
 * botProfile: JSON object containing user's profile details
 * onProgress(result): callback after each job
 */
async function applyBatch(cookies, jobs, botProfile, onProgress) {
  const browser = await launchBrowser();
  let sessionPage = null;

  try {
    sessionPage = await createSessionPage(browser, cookies);
  } catch (err) {
    console.error('[Naukri Applier] CRITICAL ERROR during startup:', err.message);
    await browser.close();
    const msg = err.message === 'SESSION_EXPIRED'
      ? 'Naukri session expired. Please re-link your account in Portals.'
      : `Session error: ${err.message}`;
    return jobs.map(j => ({
      applicationId: j.applicationId,
      success: false,
      status: 'failed',
      message: msg,
    }));
  }

  const results = [];

  for (const job of jobs) {
    const result = await applyToJob(sessionPage, job.jobUrl, botProfile);
    const entry = { applicationId: job.applicationId, ...result };
    results.push(entry);
    if (onProgress) onProgress(entry);

    // Human-like delay: 30–60 seconds between applications
    if (jobs.indexOf(job) < jobs.length - 1) {
      const waitMs = 30000 + Math.random() * 30000;
      console.log(`[Naukri Applier] Waiting ${Math.round(waitMs / 1000)}s before next...`);
      await delay(waitMs);
    }
  }

  await browser.close();
  return results;
}

module.exports = { applyBatch };
