const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const sendEmail = require('../utils/email');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email, password } = req.body;

    // Check if user exists and get password
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error. Please try again.',
    });
  }
};

// @desc    Initiate forgot password flow
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: 'If an account exists with that email, a reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    await user.save({ validateBeforeSave: false });

    const appUrl = process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:8081';
    const resetUrl = `${appUrl.replace(/\/$/, '')}/reset-password?token=${resetToken}`;

    const message = `You requested to reset your JobEase password. Use the secure link below within the next 10 minutes:\n\n${resetUrl}\n\nIf you did not make this request, you can safely ignore this email.`;

    await sendEmail({
      to: user.email,
      subject: 'Reset your JobEase password',
      text: message,
      html: `
        <p>You requested to reset your JobEase password.</p>
        <p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">Click here to set a new password</a>. The link will expire in 10 minutes.</p>
        <p>If you did not make this request, you can ignore this message.</p>
      `,
    });

    res.status(200).json({
      success: true,
      message: 'If an account exists with that email, a reset link has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to send reset email. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { token, password } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Reset link is invalid or has expired',
      });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const authToken = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      token: authToken,
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to reset password. Please try again later.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// =========================
// OTP-based reset endpoints
// =========================

// @desc    Send OTP code for password reset
// @route   POST /api/auth/forgot-password-otp
// @access  Public
exports.forgotPasswordOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    // Always return 200 to avoid email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: 'If an account exists, an OTP has been sent.' });
    }

    // rate-limit attempts by clearing after 3 failed verifications
    const otp = (Math.floor(100000 + Math.random() * 900000)).toString(); // 6-digit numeric
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

    user.resetOtpHash = otpHash;
    user.resetOtpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
    user.resetOtpAttempts = 0;
    await user.save({ validateBeforeSave: false });

    const subject = 'Your JobEase password reset OTP';
    const text = `Use this code to reset your JobEase password. It expires in 10 minutes.\n\nOTP: ${otp}\n\nIf you didn't request this, you can ignore this email.`;
    const html = `
      <p>Use this code to reset your JobEase password. It expires in <strong>10 minutes</strong>.</p>
      <h2 style="font-size:28px;letter-spacing:4px;">${otp}</h2>
      <p>If you didn’t request this, you can ignore this email.</p>
    `;

    await sendEmail({ to: email, subject, text, html });

    res.status(200).json({ success: true, message: 'If an account exists, an OTP has been sent.' });
  } catch (error) {
    console.error('Forgot password OTP error:', error);
    res.status(500).json({ success: false, message: 'Unable to send OTP. Please try again later.' });
  }
};

// @desc    Verify OTP code for password reset
// @route   POST /api/auth/verify-reset-otp
// @access  Public
exports.verifyResetOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.resetOtpHash || !user.resetOtpExpire) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (user.resetOtpExpire.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    const providedHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (providedHash !== user.resetOtpHash) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    res.status(200).json({ success: true, message: 'OTP verified' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
};

// @desc    Reset password using OTP
// @route   POST /api/auth/reset-password-otp
// @access  Public
exports.resetPasswordWithOtp = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { email, otp, password } = req.body;
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.resetOtpHash || !user.resetOtpExpire) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (user.resetOtpExpire.getTime() <= Date.now()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    const providedHash = crypto.createHash('sha256').update(otp).digest('hex');
    if (providedHash !== user.resetOtpHash) {
      user.resetOtpAttempts = (user.resetOtpAttempts || 0) + 1;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    user.password = password;
    user.resetOtpHash = undefined;
    user.resetOtpExpire = undefined;
    user.resetOtpAttempts = 0;
    await user.save();

    const token = generateToken(user._id);
    res.status(200).json({ success: true, message: 'Password updated successfully', token });
  } catch (error) {
    console.error('Reset password with OTP error:', error);
    res.status(500).json({ success: false, message: 'Unable to reset password. Please try again later.' });
  }
};


