const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { encrypt, decrypt } = require('../naukri/encryption');
const { applyBatch } = require('../naukri/applier');
const { scrapeNaukriJobs } = require('../naukri/scraper');
const Application = require('../models/Application');
const Job = require('../models/Job');

// ─────────────────────────────────────────────────────────────
// POST /api/naukri/link
// Save encrypted Naukri session cookies (captured from WebView)
// Body: { cookies: [...], email?: string }
// ─────────────────────────────────────────────────────────────
router.post('/link', protect, async (req, res) => {
  const { cookies, email } = req.body;
  if (!cookies || !Array.isArray(cookies) || cookies.length === 0) {
    return res.status(400).json({ success: false, message: 'Session cookies are required' });
  }

  try {
    // Encrypt the full cookie array as JSON
    const cookiesEncrypted = encrypt(JSON.stringify(cookies));

    // Cookies typically last 30 days on Naukri
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    req.user.naukriPortal = {
      cookiesEncrypted,
      naukriEmail: email || null,
      linkedAt: new Date(),
      expiresAt,
      isActive: true,
      dailyApplyLimit: 20,
    };
    await req.user.save();

    res.json({
      success: true,
      message: 'Naukri account linked successfully via session cookies',
      email: email || '(detected from session)',
    });
  } catch (err) {
    console.error('[Naukri] Link error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Failed to link account' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/naukri/unlink
// ─────────────────────────────────────────────────────────────
router.delete('/unlink', protect, async (req, res) => {
  try {
    req.user.naukriPortal = {
      isActive: false,
      cookiesEncrypted: undefined,
      naukriEmail: undefined,
    };
    await req.user.save();
    res.json({ success: true, message: 'Naukri account unlinked' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unlink account' });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/naukri/status
// ─────────────────────────────────────────────────────────────
router.get('/status', protect, async (req, res) => {
  const portal = req.user.naukriPortal;
  const isLinked = !!(portal?.isActive && portal?.cookiesEncrypted);

  // Check if cookies have expired
  let expired = false;
  if (isLinked && portal.expiresAt && new Date(portal.expiresAt) < new Date()) {
    expired = true;
  }

  res.json({
    success: true,
    isLinked: isLinked && !expired,
    expired,
    email: isLinked ? portal.naukriEmail : null,
    linkedAt: isLinked ? portal.linkedAt : null,
    expiresAt: isLinked ? portal.expiresAt : null,
    dailyApplyLimit: portal?.dailyApplyLimit ?? 20,
  });
});

// ─────────────────────────────────────────────────────────────
// POST /api/naukri/scrape
// ─────────────────────────────────────────────────────────────
router.post('/scrape', protect, async (req, res) => {
  const { keyword = 'software developer' } = req.body;
  try {
    res.json({ success: true, message: `Naukri scrape started for "${keyword}". Check jobs endpoint shortly.` });

    scrapeNaukriJobs(keyword, 25).then(async (jobs) => {
      for (const job of jobs) {
        if (!job.link || job.link === 'No Link Found') continue;
        await Job.findOneAndUpdate(
          { link: job.link },
          {
            ...job,
            category: keyword.charAt(0).toUpperCase() + keyword.slice(1),
            scrapedAt: new Date(),
          },
          { upsert: true, new: true },
        ).catch(e => console.error('[Naukri] DB upsert error:', e.message));
      }
      console.log(`[Naukri Scraper] Saved ${jobs.length} jobs (keyword: "${keyword}")`);
    }).catch(e => console.error('[Naukri] Background scrape error:', e.message));

  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to start scrape' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/naukri/queue
// Body: { jobs: [{ jobTitle, company, jobUrl }] }
// ─────────────────────────────────────────────────────────────
router.post('/queue', protect, async (req, res) => {
  const { jobs } = req.body;
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return res.status(400).json({ success: false, message: 'jobs array is required' });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const appliedToday = await Application.countDocuments({
    userId: req.user._id,
    createdAt: { $gte: today },
    status: 'applied',
  });
  const limit = req.user.naukriPortal?.dailyApplyLimit ?? 20;
  const remaining = Math.max(0, limit - appliedToday);
  const toQueue = jobs.slice(0, remaining);

  if (toQueue.length === 0) {
    return res.status(429).json({ success: false, message: `Daily apply limit of ${limit} reached. Try again tomorrow.` });
  }

  try {
    const created = await Application.insertMany(
      toQueue.map(j => ({
        userId: req.user._id,
        portal: 'Naukri',
        jobTitle: j.jobTitle,
        company: j.company,
        jobUrl: j.jobUrl,
        status: 'pending',
      })),
    );
    res.json({ success: true, queued: created.length, applications: created });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to queue applications' });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/naukri/apply
// Fire auto-apply using stored session cookies
// ─────────────────────────────────────────────────────────────
router.post('/apply', protect, async (req, res) => {
  const portal = req.user.naukriPortal;
  if (!portal?.isActive || !portal?.cookiesEncrypted) {
    return res.status(400).json({ success: false, message: 'Naukri account not linked' });
  }

  // Check expiry
  if (portal.expiresAt && new Date(portal.expiresAt) < new Date()) {
    return res.status(401).json({ success: false, message: 'Naukri session expired. Please re-link your account.' });
  }

  const pendingApps = await Application.find({ userId: req.user._id, status: 'pending' });
  if (pendingApps.length === 0) {
    return res.status(400).json({ success: false, message: 'No pending applications in queue' });
  }

  // Decrypt cookies
  let cookies;
  try {
    cookies = JSON.parse(decrypt(portal.cookiesEncrypted));
  } catch {
    return res.status(500).json({ success: false, message: 'Failed to decrypt session. Please re-link your account.' });
  }

  // Acknowledge quickly — applying happens in background
  res.json({
    success: true,
    message: `Started auto-applying to ${pendingApps.length} job(s). Check /applications for results.`,
    count: pendingApps.length,
  });

  // Run in background
  const jobsForApplier = pendingApps.map(a => ({
    applicationId: a._id.toString(),
    jobUrl: a.jobUrl,
    jobTitle: a.jobTitle,
    company: a.company,
  }));

  applyBatch(cookies, jobsForApplier, req.user.botProfile || {}, async (result) => {
    await Application.findByIdAndUpdate(result.applicationId, {
      status: result.status,
      failReason: result.success ? undefined : result.message,
      appliedAt: result.success ? new Date() : undefined,
    }).catch(e => console.error('[Naukri] DB update error:', e.message));
  }).catch(e => console.error('[Naukri] Apply batch error:', e.message));
});

// ─────────────────────────────────────────────────────────────
// GET /api/naukri/applications
// ─────────────────────────────────────────────────────────────
router.get('/applications', protect, async (req, res) => {
  try {
    const apps = await Application.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);
    res.json({ success: true, count: apps.length, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/naukri/queue/:id
// ─────────────────────────────────────────────────────────────
router.delete('/queue/:id', protect, async (req, res) => {
  try {
    const app = await Application.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
      status: 'pending',
    });
    if (!app) return res.status(404).json({ success: false, message: 'Not found or already processed' });
    res.json({ success: true, message: 'Removed from queue' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove' });
  }
});

module.exports = router;
