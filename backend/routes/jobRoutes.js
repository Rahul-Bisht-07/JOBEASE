const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
// WWR scraper — disabled for now, using Naukri only
// const { scrapeJobs, scrapeJobDetails, scrapeSearch } = require('../scraper');
// const { runScraper } = require('../scheduler');
const { scrapeNaukriJobs, scrapeJobDetailStandalone } = require('../naukri/scraper');

// @desc    Dynamic Search (Live Scrape from Naukri)
// @route   POST /api/jobs/search
// @access  Public
router.post('/search', async (req, res) => {
    const { term } = req.body;
    if (!term) {
        return res.status(400).json({ success: false, message: 'Term is required' });
    }

    try {
        console.log(`Live searching Naukri for term: ${term}...`);
        const jobs = await scrapeNaukriJobs(term, 15);

        if (!jobs || jobs.length === 0) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        const limitedJobs = jobs.slice(0, 15);
        const categoryName = term.charAt(0).toUpperCase() + term.slice(1).toLowerCase();

        for (const job of limitedJobs) {
            if (!job.link || job.link === 'No Link Found') continue;
            await Job.findOneAndUpdate(
                { link: job.link },
                { ...job, category: categoryName, scrapedAt: new Date() },
                { upsert: true }
            );
        }

        res.json({
            success: true,
            count: limitedJobs.length,
            data: limitedJobs
        });

    } catch (error) {
        console.error('Error in POST /api/jobs/search:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error during live search'
        });
    }
});

// @desc    Get all jobs
// @route   GET /api/jobs
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { search, category } = req.query;

        // Build query
        let query = {};
        if (category) {
            query.category = category;
        }
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { company: { $regex: search, $options: 'i' } }
            ];
        }

        // Fetch from DB
        const jobs = await Job.find(query).sort({ createdAt: -1 }).limit(50);

        res.json({
            success: true,
            count: jobs.length,
            data: jobs,
        });
    } catch (error) {
        console.error('Error in GET /api/jobs:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error',
            error: error.message
        });
    }
});

// @desc    Get job details (scrapes from Naukri)
// @route   POST /api/jobs/details
// @access  Public
router.post('/details', async (req, res) => {
    const { link } = req.body;
    if (!link) {
        return res.status(400).json({ success: false, message: 'Link is required' });
    }

    try {
        console.log(`Scraping details for ${link}...`);
        const details = await scrapeJobDetailStandalone(link);

        if (!details) {
            return res.status(404).json({ success: false, message: 'Could not scrape details' });
        }

        res.json({
            success: true,
            data: details
        });

    } catch (error) {
        console.error('Error in POST /api/jobs/details:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error during detail scraping'
        });
    }
});

module.exports = router;
