const puppeteerExtra = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteerExtra.use(StealthPlugin());

/**
 * Build Naukri search URL from keyword
 */
function buildSearchUrl(keyword, page = 1) {
  const slug = keyword.trim().toLowerCase().replace(/\s+/g, '-');
  const base = `https://www.naukri.com/${slug}-jobs`;
  return page > 1 ? `${base}-${page}` : base;
}

/**
 * Launch a stealth browser with sensible defaults
 */
async function launchBrowser() {
  return puppeteerExtra.launch({
    headless: 'new',
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

const delay = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Scrape job details from a specific Naukri job page.
 * Extracts: description, industry, department, role, employmentType, education, companyAbout, companyHq, logo
 */
async function scrapeNaukriJobDetails(page, url) {
  console.log(`  [Detail] Scraping: ${url}`);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await delay(1500);

    const details = await page.evaluate(() => {
      // Helper: get text content safely
      const getText = (selectors) => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.innerText.trim()) return el.innerText.trim();
        }
        return '';
      };

      // Helper: get value from label-value pairs (Naukri uses various structures)
      const getLabelValue = (label) => {
        // Try finding by section headers
        const allLabels = document.querySelectorAll('.styles_details__Y424J .styles_details__key, .other-details .details-title, .jd-other-detail label, .val-cell label');
        for (const el of allLabels) {
          if (el.innerText.trim().toLowerCase().includes(label.toLowerCase())) {
            // Value is usually in the next sibling or parent's next element
            const valueEl = el.nextElementSibling || el.parentElement?.querySelector('span, p');
            if (valueEl) return valueEl.innerText.trim();
          }
        }
        return '';
      };

      // ── Job Description ──
      const description = getText([
        '.styles_JDC__dang-inner-html__h0K4t',
        '.dang-inner-html',
        '.job-desc',
        '.jd-desc',
        '[class*="job-description"]',
        '.styles_job-desc-container',
      ]);

      // ── Other Details (from the detail chips/sections) ──
      // Naukri shows these as labeled fields on the job page
      const otherDetailsSection = document.querySelector('.styles_other-details__oEN4O, .other-details, .jd-other-detail');
      let industry = '', department = '', role = '', employmentType = '', education = '';

      if (otherDetailsSection) {
        const items = otherDetailsSection.querySelectorAll('.styles_details__Y424J, .details-section, .detail-row, div[class*="detail"]');
        items.forEach(item => {
          const labelEl = item.querySelector('label, .styles_details__key, .key, .title');
          const valueEl = item.querySelector('span, .styles_details__value, .value, p');
          if (!labelEl || !valueEl) return;
          const label = labelEl.innerText.trim().toLowerCase();
          const value = valueEl.innerText.trim();
          if (label.includes('industry')) industry = value;
          else if (label.includes('department')) department = value;
          else if (label.includes('role')) {
            if (label.includes('category')) { /* skip role category */ }
            else role = value;
          }
          else if (label.includes('employment')) employmentType = value;
          else if (label.includes('education')) education = value;
        });
      }

      // Fallback: try generic key-value extraction
      if (!industry || !department) {
        const allText = document.body.innerText;
        const match = (pattern) => {
          const m = allText.match(pattern);
          return m ? m[1].trim() : '';
        };
        if (!industry) industry = match(/Industry\s*[:\n]\s*(.+?)(?:\n|$)/i);
        if (!department) department = match(/Department\s*[:\n]\s*(.+?)(?:\n|$)/i);
        if (!role) role = match(/Role\s*[:\n]\s*(.+?)(?:\n|$)/i);
        if (!employmentType) employmentType = match(/Employment\s*[Tt]ype\s*[:\n]\s*(.+?)(?:\n|$)/i);
        if (!education) education = match(/Education\s*[:\n]\s*(.+?)(?:\n|$)/i);
      }

      // ── About Company ──
      const companyAbout = getText([
        '.styles_about-company__desc',
        '.about-company .detail',
        '.comp-info-detail',
        '.about-company p',
        '[class*="about-company"] [class*="detail"]',
      ]);

      // ── Company HQ / Address ──
      const companyHq = getText([
        '.styles_about-company__address',
        '.about-company .address',
        '.comp-info-address',
        '[class*="headquarters"]',
      ]);

      // ── Logo ──
      const logoEl = document.querySelector('.styles_jhc__comp-info-logo img, .company-logo img, .comp-logo img, img[class*="logo"]');
      const logo = logoEl?.src || '';

      return {
        description,
        industry,
        department,
        role,
        employmentType,
        education,
        companyAbout,
        companyHq,
        logo,
      };
    });

    return details;
  } catch (err) {
    console.error(`  [Detail] Error for ${url}:`, err.message);
    return null;
  }
}

/**
 * Scrape Naukri search results + visit each job page for full details.
 * Returns array of complete job objects.
 */
async function scrapeNaukriJobs(keyword = 'software developer', maxJobs = 20) {
  console.log(`[Naukri Scraper] Searching: "${keyword}"`);
  const browser = await launchBrowser();
  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  );
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  const jobs = [];

  try {
    const url = buildSearchUrl(keyword);
    console.log(`[Naukri Scraper] URL: ${url}`);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('article.jobTuple, .srp-jobtuple-wrapper, .cust-job-tuple', { timeout: 10000 })
      .catch(() => console.warn('[Naukri Scraper] Selector timeout — attempting extraction anyway'));

    await delay(1500);

    // ── Step 1: Extract basic info from search results ──
    const rawJobs = await page.evaluate(() => {
      const results = [];
      const cardSelectors = [
        '.srp-jobtuple-wrapper',
        'article.jobTuple',
        '.cust-job-tuple',
        '.jobTupleHeader',
      ];

      let cards = [];
      for (const sel of cardSelectors) {
        cards = Array.from(document.querySelectorAll(sel));
        if (cards.length > 0) break;
      }

      cards.forEach(card => {
        const titleEl = card.querySelector('a.title, .title a, .job-title a, h2 a, a[class*="title"]');
        const companyEl = card.querySelector('.comp-name, .subTitle, .company-name, a.comp-name');
        const locationEl = card.querySelector('.loc, .locWdth, span[class*="location"], li.location');
        const salaryEl = card.querySelector('.sal, .salary, span[class*="salary"]');
        const expEl = card.querySelector('.exp, .experience, span[class*="experience"]');

        const title = titleEl?.innerText?.trim();
        const link = titleEl?.href;
        const company = companyEl?.innerText?.trim();

        if (!title || !link || !company) return;

        results.push({
          title,
          company,
          link: link.split('?')[0],
          location: locationEl?.innerText?.trim() || 'India',
          salary: salaryEl?.innerText?.trim() || null,
          experience: expEl?.innerText?.trim() || null,
          source: 'Naukri',
        });
      });

      return results;
    });

    const jobsToProcess = rawJobs.slice(0, maxJobs);
    console.log(`[Naukri Scraper] Found ${jobsToProcess.length} jobs, now scraping details...`);

    // ── Step 2: Visit each job page for full details ──
    for (const job of jobsToProcess) {
      if (!job.link || job.link === 'No Link Found') {
        jobs.push(job);
        continue;
      }

      const details = await scrapeNaukriJobDetails(page, job.link);
      if (details) {
        jobs.push({
          ...job,
          description: details.description || '',
          industry: details.industry || '',
          department: details.department || '',
          role: details.role || '',
          employmentType: details.employmentType || '',
          education: details.education || '',
          companyAbout: details.companyAbout || '',
          companyHq: details.companyHq || '',
          logo: details.logo || '',
        });
      } else {
        jobs.push(job);
      }

      // Small delay between detail pages
      await delay(1000 + Math.random() * 1000);
    }

    console.log(`[Naukri Scraper] Completed ${jobs.length} jobs with details for "${keyword}"`);
  } catch (err) {
    console.error(`[Naukri Scraper] Error for "${keyword}":`, err.message);
  } finally {
    await browser.close();
  }

  return jobs;
}

/**
 * Standalone wrapper: launches its own browser to scrape a single job URL.
 * Used by the /api/jobs/details API route.
 */
async function scrapeJobDetailStandalone(url) {
  const browser = await launchBrowser();
  const page = await browser.newPage();
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  );
  try {
    const details = await scrapeNaukriJobDetails(page, url);
    return details;
  } finally {
    await browser.close();
  }
}

module.exports = { scrapeNaukriJobs, scrapeNaukriJobDetails, scrapeJobDetailStandalone };
