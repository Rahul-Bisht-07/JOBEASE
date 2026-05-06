const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { askAI } = require('../utils/aiService');

puppeteerExtra.use(StealthPlugin());

/**
 * Small human-like delay
 */
const delay = (ms) => new Promise(r => setTimeout(r, ms));
const humanDelay = () => delay(800 + Math.random() * 1200);

/**
 * Launch a stealth browser
 */
async function launchBrowser() {
  return puppeteerExtra.launch({
    headless: false, // Visible so we can debug
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--start-maximized',
    ],
    defaultViewport: null, // Use the actual window size (matches your real browser exactly)
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
    let lastContextHash = ''; // Track previous context to detect stuck loops

    while (chatbotAttempt < 10) {
      chatbotAttempt++;
      await delay(2000);

      // 0. Check for success FIRST (before doing anything else)
      const successEl = await page.$('.apply-status-header, .success-message, .apply-message, .apply-success, .applied-successfully').then(el => !!el).catch(() => false);
      const successText = await page.evaluate(() => {
        return document.body.innerText.toLowerCase().includes('successfully applied') ||
          document.body.innerText.toLowerCase().includes('applied successfully');
      }).catch(() => false);
      const currentUrl = page.url();
      if (successEl || successText || currentUrl.includes('applied') || currentUrl.includes('success')) {
        console.log('[Naukri Applier] ✅ Application confirmed successful!');
        return { success: true, status: 'applied', message: 'Application submitted successfully' };
      }

      // 1. Check for CAPTCHA (only if it's actually VISIBLE — not just a hidden reCAPTCHA badge)
      const hasCaptcha = await page.evaluate(() => {
        const captchaIframe = document.querySelector('iframe[src*="captcha"], iframe[src*="recaptcha/api2/anchor"], iframe[src*="recaptcha/api2/bframe"]');
        const captchaDiv = document.querySelector('.g-recaptcha');
        const el = captchaIframe || captchaDiv;
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 50 && rect.height > 50 && style.display !== 'none' && style.visibility !== 'hidden';
      }).catch(() => false);
      if (hasCaptcha) {
        return { success: false, status: 'captcha', message: 'CAPTCHA required — cannot auto-apply' };
      }

      // 2. Check for Chatbot Modal
      const chatbotModal = await page.$('.chatbot_Drawer, .botwrap, [class*="chatbot"], [class*="chat-window"], [class*="chat-container"]');

      let textInput = null;

      if (chatbotModal) {
        textInput = await chatbotModal.$('div[contenteditable="true"], input[type="text"], input[type="number"], textarea, input:not([type="hidden"])');
      } else {
        textInput = await page.$('div[contenteditable="true"], .botwrap input[type="text"], input[placeholder*="message" i], textarea[placeholder*="message" i]');
      }

      if (!textInput && !chatbotModal) {
        // No chatbot and no text input detected — break out
        console.log('[Chatbot] No chatbot detected, no explicit success. Assuming optimistic success.');
        break;
      }

      // 3. Extract ONLY the last question from the chat context (not the entire history)
      const chatContextText = await page.evaluate((modal) => {
        const container = modal || document.querySelector('.botwrap, [class*="chatbot"]');
        if (!container) return 'Unknown Question';

        const fullText = container.innerText;

        // Try to find the LAST question by splitting on common question patterns.
        // Chatbot messages often end with "?" or are the last new line block.
        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

        // UI strings to IGNORE — these are buttons/placeholders, not actual questions
        const ignorePatterns = [
          /^skip this question$/i,
          /^skip$/i,
          /^save$/i,
          /^send$/i,
          /^next$/i,
          /^submit$/i,
          /^continue$/i,
          /^type\s*(a\s*)?message/i,
          /^for example/i,
          /^e\.?g\.?\s*:/i,
          /^placeholder/i,
          /^hi .+thank you for showing interest/i,  // Welcome message
          /^kindly answer/i,
        ];

        // Walk backwards to find the last meaningful question line
        for (let i = lines.length - 1; i >= 0; i--) {
          const line = lines[i];
          // Skip timestamps, "Sent", our own answers (usually short), empty stuff
          if (line.length < 5) continue;
          if (/^\d{1,2}:\d{2}/.test(line)) continue;   // "12:30 PM" timestamp
          if (/^sent$/i.test(line)) continue;
          // Skip UI button text
          if (ignorePatterns.some(p => p.test(line))) continue;
          // Return the last meaningful line (likely the question)
          return line;
        }

        // Fallback: return last 200 chars of the full text
        return fullText.slice(-200);
      }, chatbotModal);

      // 4. LOOP DETECTION — if we see the exact same context twice, we're stuck
      const contextHash = chatContextText.trim().toLowerCase();
      if (contextHash === lastContextHash) {
        console.log(`[Chatbot] ⚠️ Stuck loop detected! Same question repeated. Breaking out.`);
        break;
      }
      lastContextHash = contextHash;

      // 5. GREETING/WELCOME DETECTION — skip non-question messages
      const ctxLower = chatContextText.trim().toLowerCase();
      const isGreeting = /^(hi|hello|hey|welcome|thank you for (showing interest|applying|your interest)|kindly answer|please answer|we would like to ask)/i.test(ctxLower)
        || /thank you for showing interest/i.test(ctxLower)
        || /we.*(would|will|going to).*(ask|know|assess)/i.test(ctxLower)
        || /let.*(begin|start|know)/i.test(ctxLower);
      
      if (isGreeting && !ctxLower.includes('?')) {
        console.log(`[Chatbot] 👋 Detected greeting/welcome message — skipping, clicking Next/Save...`);
        // Just click the Save/Next/Continue button to proceed
        await page.evaluate(() => {
          const allElements = document.querySelectorAll('button, div, span, a, [role="button"], input[type="submit"]');
          for (const el of allElements) {
            const text = el.innerText?.trim().toLowerCase();
            if (text === 'save' || text === 'submit' || text === 'next' || text === 'continue' || text === 'ok' || text === 'okay') {
              const style = window.getComputedStyle(el);
              if (style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 10) {
                el.click();
                break;
              }
            }
          }
        });
        await delay(2000);
        continue; // Skip to the next chatbot loop iteration
      }

      let inputType = 'unknown';
      let options = [];

      // SMART INPUT DETECTION — detect radio, checkbox, and chip options
      // Step 1: Look for real <input type="checkbox"> elements (check BEFORE radios)
      const realCheckboxes = await page.evaluate(() => {
        const checkboxes = document.querySelectorAll('input[type="checkbox"]');
        if (checkboxes.length === 0) return [];
        const labels = [];
        for (const cb of checkboxes) {
          const parent = cb.closest('label') || cb.parentElement;
          const text = parent?.innerText?.trim() || '';
          if (text.length > 0 && text.length < 50) {
            labels.push(text);
          }
        }
        return labels;
      });

      // Step 2: Look for real <input type="radio"> elements
      const realRadios = await page.evaluate(() => {
        const radios = document.querySelectorAll('input[type="radio"]');
        if (radios.length === 0) return [];
        const labels = [];
        for (const radio of radios) {
          const parent = radio.closest('label') || radio.parentElement;
          const text = parent?.innerText?.trim() || '';
          if (text.length > 0 && text.length < 50) {
            labels.push(text);
          }
        }
        return labels;
      });

      if (realCheckboxes.length >= 2) {
        options = realCheckboxes;
        inputType = 'checkbox';
      } else if (realRadios.length >= 2) {
        options = realRadios;
        inputType = 'radio';
      } else if (chatbotModal) {
        // Step 3: Look for chip/option-like elements only in the LATEST message area
        const chipOptions = await page.evaluate((modal) => {
          const chips = modal.querySelectorAll('.chip, [class*="chip"], [class*="Chip"], [class*="option"], [class*="Option"]');
          
          const results = [];
          for (const chip of chips) {
            const text = chip.innerText?.trim();
            const style = window.getComputedStyle(chip);
            if (text && text.length > 0 && text.length < 50 && 
                !text.includes('?') &&
                style.display !== 'none' && style.visibility !== 'hidden' &&
                chip.offsetHeight > 0) {
              results.push(text);
            }
          }
          
          return results;
        }, chatbotModal);
        
        if (chipOptions.length >= 2) {
          options = chipOptions;
          inputType = 'radio';
        }
      }

      // Final fallback: if we detected options, filter out noise
      if (options.length > 0) {
        // Remove duplicates
        options = [...new Set(options)];
        // Remove the question text itself if it leaked in
        options = options.filter(opt => {
          const lower = opt.toLowerCase();
          // Skip if it's the question or part of it
          if (chatContextText.toLowerCase().includes(lower) && lower.length > 10) return false;
          // Skip UI elements
          if (/^(skip|save|send|next|submit|continue)$/i.test(opt)) return false;
          return true;
        });
        
        if (options.length < 2) {
          // Not enough real options — treat as text input
          options = [];
          inputType = textInput ? 'text' : 'unknown';
        }
      }

      if (inputType === 'unknown' && textInput) {
        inputType = 'text';
      }

      if (options.length > 0) {
        console.log(`[Chatbot] Detected ${options.length} ${inputType} options: [${options.join(', ')}]`);
      }

      console.log(`[Chatbot] Question: "${chatContextText.substring(0, 100)}..." | Type: ${inputType} | Opts:`, options);

      // Normalize checkbox → radio for the AI prompt (AI just picks one option either way)
      const aiInputType = inputType === 'checkbox' ? 'radio' : inputType;

      let aiDecision = await askAI(botProfile, chatContextText, aiInputType, options);

      // If ALL AI providers failed, use smart fallback instead of abandoning the job
      if (!aiDecision) {
        console.log('[Chatbot] ⚠️ All AI providers failed — using smart fallback...');
        const qLower = chatContextText.toLowerCase();

        if ((inputType === 'radio' || inputType === 'checkbox') && options.length > 0) {
          // For radio/checkbox: pick "Yes" if available, otherwise first option
          const yesOpt = options.find(o => /^yes$/i.test(o.trim()));
          aiDecision = { action: 'select', value: yesOpt ? yesOpt.trim() : options[0].trim() };
        } else if (/how many|years of experience|yrs|year/i.test(qLower)) {
          // Experience questions → "0" is always safe
          aiDecision = { action: 'type', value: '0' };
        } else if (/salary|ctc|compensation|package/i.test(qLower)) {
          aiDecision = { action: 'type', value: botProfile?.expectedCTC || '0' };
        } else if (/notice period/i.test(qLower)) {
          aiDecision = { action: 'type', value: botProfile?.noticePeriod || '0' };
        } else {
          // Generic last resort
          aiDecision = { action: 'type', value: 'NA' };
        }
        console.log(`[Chatbot] 🔧 Fallback answer: ${aiDecision.action} → "${aiDecision.value}"`);
      }

      console.log(`[Chatbot] AI decided to ${aiDecision.action}: ${aiDecision.value}`);

      if (aiDecision.action === 'type' && textInput) {
        // Focus and clear input (handles both inputs and contenteditable divs)
        await page.evaluate((el) => {
          el.innerText = '';
          el.value = '';
          el.focus();
        }, textInput);

        await textInput.type(String(aiDecision.value), { delay: 50 });
      } else if (aiDecision.action === 'select' && options.length > 0) {
        // Click the matching radio/checkbox option directly in the DOM
        const clicked = await page.evaluate((targetValue, isCheckbox) => {
          // Strategy 1a: Find input[type="checkbox"] and click it
          if (isCheckbox) {
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            for (const cb of checkboxes) {
              const parent = cb.closest('label') || cb.parentElement;
              const text = parent?.innerText?.trim() || '';
              if (text === targetValue) {
                if (!cb.checked) cb.click();
                return true;
              }
            }
          }

          // Strategy 1b: Find input[type="radio"] and click its label
          const radios = document.querySelectorAll('input[type="radio"]');
          for (const radio of radios) {
            const parent = radio.closest('label') || radio.parentElement;
            const text = parent?.innerText?.trim() || '';
            if (text === targetValue) {
              radio.click();
              return true;
            }
          }
          
          // Strategy 2: Find any clickable element with exact matching text
          const allClickable = document.querySelectorAll('label, .chip, [class*="chip"], [class*="Chip"], [class*="option"], [class*="Option"], [role="button"], li');
          for (const el of allClickable) {
            if (el.innerText?.trim() === targetValue && el.offsetHeight > 0) {
              el.click();
              return true;
            }
          }
          return false;
        }, aiDecision.value.trim(), inputType === 'checkbox');
        
        if (!clicked) {
          console.log(`[Chatbot] ⚠️ Could not find ${inputType} option "${aiDecision.value}" to click`);
        }
        await delay(1000); // Wait for Save button to possibly appear/activate
      }

      // Submit the answer — Enter key for text inputs
      if (textInput && aiDecision.action === 'type') {
        await textInput.press('Enter');
        await delay(500);
      }

      // Force-click the Save/Send/Submit/Next button via JS
      // Naukri chatbot uses a "Save" button for radio questions and a send icon for text
      const submitClicked = await page.evaluate(() => {
        // Comprehensive list of possible submit/save/send buttons
        const selectors = [
          // ★ Naukri chatbot Save button (exact match from DOM inspection)
          'div.sendMsg',                          // The actual Save button (it's a div!)
          '.sendMsgbtn_container div.sendMsg',     // More specific path
          '.send div.sendMsg',                     // Parent → Save
          // Naukri chatbot specific
          '.chatbot_SaveBtn',
          '.botwrap button[type="submit"]',
          // Send icon (for text questions)
          'button[aria-label*="send" i]',
          '[class*="send-icon"]',
          '[class*="add-icon"]:not(.d-none)',
          'span.chatBot-add-round:not(.d-none)',
          '.chatbot_SendMessageContainer span',
          // Generic buttons
          'input[type="submit"]',
          'button[type="submit"]',
        ];

        let didClick = false;
        for (const sel of selectors) {
          if (didClick) break;
          const btns = document.querySelectorAll(sel);
          for (const btn of btns) {
            const style = window.getComputedStyle(btn);
            // Click if visible
            if (style.display !== 'none' && style.visibility !== 'hidden' && 
                btn.offsetHeight > 0 && !btn.className.includes('d-none')) {
              btn.scrollIntoView({ behavior: 'instant', block: 'center' });
              btn.click();
              didClick = true;
              break;
            }
          }
        }

        // Last resort: find ANY element with text "Save" anywhere on the page
        if (!didClick) {
          const allElements = document.querySelectorAll('button, div, span, a, [role="button"], input[type="submit"]');
          for (const el of allElements) {
            const text = el.innerText?.trim().toLowerCase();
            if (text === 'save' || text === 'submit' || text === 'next' || text === 'continue') {
              const style = window.getComputedStyle(el);
              if (style.display !== 'none' && style.visibility !== 'hidden' && el.offsetHeight > 10) {
                el.scrollIntoView({ behavior: 'instant', block: 'center' });
                el.click();
                console.log('Clicked element:', el.tagName, el.className);
                didClick = true;
                break;
              }
            }
          }
        }
        return didClick;
      });
      
      if (submitClicked) {
        console.log('[Chatbot] ✅ Clicked Save/Send/Submit button.');
      } else {
        console.log('[Chatbot] ⚠️ No Save/Send button found — dumping relevant elements:');
        const allButtons = await page.evaluate(() => {
          const all = document.querySelectorAll('button, div, span, a, [role="button"], input[type="submit"]');
          const relevant = [];
          for (const el of all) {
            const text = (el.innerText?.trim() || '').toLowerCase();
            // Only log elements that might be a save/submit/send button
            if (text === 'save' || text === 'submit' || text === 'send' || text === 'next' ||
                el.className?.toLowerCase().includes('save') || el.className?.toLowerCase().includes('submit') ||
                el.className?.toLowerCase().includes('send') || el.className?.toLowerCase().includes('chatbot')) {
              relevant.push({
                tag: el.tagName,
                text: el.innerText?.trim().substring(0, 40),
                class: el.className?.substring(0, 100),
                visible: el.offsetHeight > 0,
              });
            }
          }
          return relevant;
        });
        console.log('[DEBUG] Save-related elements:', JSON.stringify(allButtons, null, 2));
      }

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
