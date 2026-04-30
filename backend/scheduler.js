const cron = require('node-cron');
const Job = require('./models/Job');
// const { scrapeJobs } = require('./scraper'); // WWR — disabled for now
const { scrapeNaukriJobs } = require('./naukri/scraper');

// WWR sources — disabled for now, keeping Naukri only
// const SOURCES = [
//     { url: 'https://weworkremotely.com/categories/remote-back-end-programming-jobs', category: 'Backend' },
//     { url: 'https://weworkremotely.com/categories/remote-front-end-programming-jobs', category: 'Frontend' },
//     { url: 'https://weworkremotely.com/categories/remote-full-stack-programming-jobs', category: 'Full Stack' }
// ];

const NAUKRI_KEYWORDS = [
    { keyword: 'software developer', category: 'Software Development' },
    { keyword: 'react developer', category: 'Frontend' },
    { keyword: 'node js developer', category: 'Backend' },
    { keyword: 'full stack developer', category: 'Full Stack' },
    { keyword: 'data scientist', category: 'Data Science' },
    { keyword: 'ui ux designer', category: 'Design' },
];

// WWR scraper — disabled for now
// const runScraper = async () => {
//     console.log('Running Scheduled Scraper (WeWorkRemotely)...');
//     for (const source of SOURCES) {
//         try {
//             console.log(`Scraping ${source.category}...`);
//             const jobs = await scrapeJobs(source.url);
//             if (jobs && jobs.length > 0) {
//                 for (const job of jobs) {
//                     await Job.findOneAndUpdate(
//                         { link: job.link },
//                         { ...job, category: source.category, scrapedAt: new Date() },
//                         { upsert: true, new: true }
//                     );
//                 }
//                 console.log(`Updated ${jobs.length} jobs for ${source.category}`);
//             }
//         } catch (error) {
//             console.error(`Failed to scrape ${source.category}:`, error);
//         }
//     }
//     console.log('WeWorkRemotely Scraper Finished.');
// };

const runNaukriScraper = async () => {
    console.log('Running Scheduled Naukri Scraper...');

    for (const { keyword, category } of NAUKRI_KEYWORDS) {
        try {
            console.log(`[Naukri] Scraping: ${keyword}`);
            const jobs = await scrapeNaukriJobs(keyword, 20);

            if (jobs && jobs.length > 0) {
                for (const job of jobs) {
                    if (!job.link || job.link === 'No Link Found') continue;
                    await Job.findOneAndUpdate(
                        { link: job.link },
                        { ...job, category, scrapedAt: new Date() },
                        { upsert: true, new: true }
                    ).catch(e => console.error('[Naukri] DB error:', e.message));
                }
                console.log(`[Naukri] Saved ${jobs.length} jobs for "${keyword}"`);
            }

            // Delay between keywords to avoid rate limiting
            await new Promise(r => setTimeout(r, 5000));
        } catch (error) {
            console.error(`[Naukri] Failed for "${keyword}":`, error.message);
        }
    }
    console.log('Naukri Scraper Finished.');
};

// ─────────────────────────────────────────────────────────
// CRON CHEATSHEET:
// ┌────────────── minute (0 - 59)
// │ ┌──────────── hour (0 - 23)
// │ │ ┌────────── day of month (1 - 31)
// │ │ │ ┌──────── month (1 - 12)
// │ │ │ │ ┌────── day of week (0 - 6) (Sunday=0)
// │ │ │ │ │
// * * * * *
// ─────────────────────────────────────────────────────────

const initScheduler = () => {
    // WWR — disabled for now
    // cron.schedule('0 0 * * *', () => {
    //     runScraper();
    // });

    // Naukri — every day at 1:00 AM
    cron.schedule('0 1 * * *', () => {
        runNaukriScraper();
    });

    console.log('Job Scheduler Initialized (Naukri: 1am daily).');
};

module.exports = { initScheduler, runNaukriScraper };
