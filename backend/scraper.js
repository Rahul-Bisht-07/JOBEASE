const puppeteer = require('puppeteer');

async function scrapeJobs(url = 'https://weworkremotely.com/categories/remote-back-end-programming-jobs') {
    console.log(`launching browser for: ${url}`);
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set a real User-Agent to bypass "Just a moment..." Cloudflare checks
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    try {
        console.log('navigating to page...');
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000 // Increase timeout for redirects
        });

        const pageTitle = await page.title();
        console.log(`Page Title: ${pageTitle}`);

        // Take a screenshot for debugging (saved to current directory)
        await page.screenshot({ path: 'debug_screenshot.png' });
        console.log('Took debug screenshot.');

        console.log('scraping jobs...');
        const jobs = await page.evaluate(() => {
            const jobNodes = document.querySelectorAll('.new-listing-container > .new-listing'); // Try to target the listing cards
            const jobList = [];

            if (jobNodes.length === 0) {
                // Fallback if the container structure is different
                const directNodes = document.querySelectorAll('.new-listing');
                if (directNodes.length > 0) {
                    // console.log('Found .new-listing elements directly');
                }
            }

            // Let's try iterating all .new-listing elements as they seem to be the cards
            const allNodes = document.querySelectorAll('.new-listing');

            // Debug link structure: Log the first node's HTML
            if (allNodes.length > 0) {
                console.log('First Node HTML:', allNodes[0].outerHTML);
                // Commented out to avoid massive logs, but will enable if needed.
                // Instead, try to find a link specifically
                const firstLink = allNodes[0].querySelector('a');
                if (firstLink) {
                    // console.log('First Link Href:', firstLink.getAttribute('href'));
                }
            }

            allNodes.forEach((node) => {
                const titleElement = node.querySelector('.new-listing__header__title');
                const companyElement = node.querySelector('.new-listing__company-name');

                // Try finding any link with an href
                let link = 'No Link Found';
                const linkElement = node.querySelector('a[href^="/remote-jobs/"]');
                const parentLink = node.closest('a');

                if (linkElement) {
                    link = linkElement.href; // .href gives absolute URL usually
                } else if (node.tagName === 'A') {
                    link = node.href;
                } else if (parentLink) {
                    link = parentLink.href;
                }

                // Fallback: check previous sibling?
                if (link === 'No Link Found' && node.previousElementSibling && node.previousElementSibling.tagName === 'A') {
                    link = node.previousElementSibling.href;
                }

                if (titleElement && companyElement) {
                    jobList.push({
                        title: titleElement.innerText.trim(),
                        company: companyElement.innerText.trim(),
                        link: link,
                        source: 'We Work Remotely'
                    });
                }
            });
            return jobList;
        });

        console.log(`found ${jobs.length} jobs!`);
        if (jobs.length > 0) {
            // Save the full HTML to a file for inspection
            const html = await page.content();
            const fs = require('fs');
            fs.writeFileSync('page_dump.html', html);
            console.log('Saved page_dump.html');
            return jobs;
        }
        return []; // Return empty array if no jobs found
    } catch (error) {
        console.error('Scraping failed:', error);
        return [];
    } finally {
        if (browser) await browser.close();
    }
}

async function scrapeJobDetails(url) {
    console.log(`Scraping details for: ${url}`);
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Set a real User-Agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36');

    try {
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        // Extract description
        const details = await page.evaluate(() => {
            // WWR specific selectors
            const descriptionNode = document.querySelector('#job-listing-show-container');
            const companyHeader = document.querySelector('.listing-header-container');

            let description = '';
            let logo = '';

            if (descriptionNode) {
                // Get all text or HTML from the description block
                // removing script tags or style tags if necessary
                description = descriptionNode.innerText.trim();
            }

            if (companyHeader) {
                const img = companyHeader.querySelector('img');
                if (img) logo = img.src;
            }

            return { description, logo };
        });

        return details;

    } catch (error) {
        console.error('Detail scraping failed:', error);
        return null;
    } finally {
        await browser.close();
    }
}

async function scrapeSearch(term) {
    const encodedTerm = encodeURIComponent(term);
    const searchUrl = `https://weworkremotely.com/remote-jobs/search?term=${encodedTerm}`;
    console.log(`Searching for: ${term} at ${searchUrl}`);

    // Reuse the existing scraper logic, just with a different URL
    // We limit strictly to 15 in the scraper for speed if needed, 
    // or just slice the result here.
    return await scrapeJobs(searchUrl);
}

module.exports = { scrapeJobs, scrapeJobDetails, scrapeSearch };
