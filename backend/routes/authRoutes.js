const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  forgotPassword,
  resetPassword,
  forgotPasswordOtp,
  verifyResetOtp,
  resetPasswordWithOtp,
} = require('../controllers/authController');
const {
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator,
  otpSendValidator,
  otpVerifyValidator,
  otpResetValidator,
} = require('../middleware/validator');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/signup', signupValidator, signup);
router.post('/login', loginValidator, login);
router.post('/forgot-password', forgotPasswordValidator, forgotPassword);
router.post('/reset-password', resetPasswordValidator, resetPassword);
// OTP-based reset
router.post('/forgot-password-otp', otpSendValidator, forgotPasswordOtp);
router.post('/verify-reset-otp', otpVerifyValidator, verifyResetOtp);
router.post('/reset-password-otp', otpResetValidator, resetPasswordWithOtp);

// Protected routes
router.get('/me', protect, getMe);

module.exports = router;


