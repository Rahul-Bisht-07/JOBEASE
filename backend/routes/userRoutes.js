const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const { body } = require('express-validator');
const { getMyProfile, updateProfile, uploadResume } = require('../controllers/userController');

// Ensure uploads directory exists
const uploadDir = path.join(process.cwd(), 'backend', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// Profile validators (expandable)
const profileValidator = [
  body('profile.bio').optional().isLength({ max: 500 }).withMessage('Bio too long'),
  body('preferences.salaryRange.min').optional().isNumeric(),
  body('preferences.salaryRange.max').optional().isNumeric(),
];

router.get('/me', protect, getMyProfile);
router.patch('/profile', protect, profileValidator, updateProfile);
router.post('/resume', protect, upload.single('resume'), uploadResume);

module.exports = router;
