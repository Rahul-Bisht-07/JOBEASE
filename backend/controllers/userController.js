const path = require('path');
const fs = require('fs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const { analyzeResume } = require('../utils/resumeScorer');

// @desc    Get my profile
// @route   GET /api/users/me
// @access  Private
exports.getMyProfile = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @desc    Update profile & preferences
// @route   PATCH /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { profile = {}, preferences = {}, botProfile = {} } = req.body;

  // Merge profile and preferences
  Object.assign(req.user.profile, profile);
  Object.assign(req.user.preferences, preferences);
  Object.assign(req.user.botProfile, botProfile);

  await req.user.save();

  res.json({ success: true, message: 'Profile updated', user: req.user });
};

// @desc    Upload resume
// @route   POST /api/users/resume
// @access  Private
exports.uploadResume = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  // Basic validation: PDF or DOCX
  const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (!allowed.includes(req.file.mimetype)) {
    // remove stored file if invalid
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ success: false, message: 'Invalid file type. Upload PDF or DOC/DOCX.' });
  }

  req.user.resume = {
    url: `/uploads/${req.file.filename}`,
    originalName: req.file.originalname,
    uploadedAt: new Date(),
    size: req.file.size,
    mimeType: req.file.mimetype,
  };

  // Run ATS resume analysis
  try {
    const scoreResult = await analyzeResume(req.file.path);
    req.user.resumeScore = scoreResult;
  } catch (err) {
    console.error('Resume scoring failed (upload still saved):', err.message);
  }

  await req.user.save();

  res.status(201).json({
    success: true,
    message: 'Resume uploaded and analyzed',
    resume: req.user.resume,
    resumeScore: req.user.resumeScore,
  });
};
