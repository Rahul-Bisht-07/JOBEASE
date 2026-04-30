const { body } = require('express-validator');

// Validation rules for signup
exports.signupValidator = [
  body('name')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Name must be at least 2 characters')
    .notEmpty()
    .withMessage('Name is required'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .notEmpty()
    .withMessage('Password is required'),
];

// Validation rules for login
exports.loginValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

// Validation for forgot password
exports.forgotPasswordValidator = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
];

// Validation for reset password
exports.resetPasswordValidator = [
  body('token')
    .isString()
    .withMessage('Reset token is required')
    .notEmpty()
    .withMessage('Reset token cannot be empty'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .notEmpty()
    .withMessage('Password is required'),
];

// OTP validators
exports.otpSendValidator = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
];

exports.otpVerifyValidator = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be numeric'),
];

exports.otpResetValidator = [
  body('email').isEmail().withMessage('Please provide a valid email').normalizeEmail(),
  body('otp')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .matches(/^\d{6}$/)
    .withMessage('OTP must be numeric'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .notEmpty()
    .withMessage('Password is required'),
];


