// src/validators/passwordValidators.js
const { body, param } = require('express-validator');

// Password validation rules
const passwordRules = {
  minLength: 8,
  maxLength: 128,
  tokenMinLength: 21,
  tokenMaxLength: 256,
  passwordPatterns: {
    uppercase: /[A-Z]/,
    lowercase: /[a-z]/,
    numbers: /[0-9]/,
    specialChars: /[!@#$%^&*(),.?":{}|<>]/
  }
};

// Helper function to sanitize email
const sanitizeEmail = (email) => {
  return email
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ''); // Remove all whitespace
};

// Validate forgot password request
const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .customSanitizer(sanitizeEmail)
    .normalizeEmail({
      gmail_remove_dots: false,
      gmail_remove_subaddress: false
    })
];

// Validate password reset request
const validateResetPassword = [
  param('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ 
      min: passwordRules.tokenMinLength, 
      max: passwordRules.tokenMaxLength 
    })
    .withMessage('Invalid token format')
    .escape(),
    
  body('newPassword')
    .trim()
    .notEmpty()
    .withMessage('New password is required')
    .isString()
    .isLength({ min: passwordRules.minLength })
    .withMessage(`Password must be at least ${passwordRules.minLength} characters long`)
    .isLength({ max: passwordRules.maxLength })
    .withMessage(`Password must not exceed ${passwordRules.maxLength} characters`)
    .matches(passwordRules.passwordPatterns.uppercase)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(passwordRules.passwordPatterns.lowercase)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(passwordRules.passwordPatterns.numbers)
    .withMessage('Password must contain at least one number')
    .matches(passwordRules.passwordPatterns.specialChars)
    .withMessage('Password must contain at least one special character')
    .custom((value) => {
      // Check for common password patterns
      const commonPatterns = [
        /^password/i,
        /^12345/,
        /^qwerty/i,
        /^admin/i,
        /^letmein/i
      ];
      
      if (commonPatterns.some(pattern => pattern.test(value))) {
        throw new Error('Password is too common. Please choose a stronger password');
      }
      
      return true;
    }),
    
  body('passwordConfirmation')
    .trim()
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

// Validate token verification request
const verifyTokenValidator = [
  param('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ 
      min: passwordRules.tokenMinLength, 
      max: passwordRules.tokenMaxLength 
    })
    .withMessage('Invalid token format')
    .escape()
];

// Validate change password request (for logged-in users)
const validateChangePassword = [
  body('currentPassword')
    .trim()
    .notEmpty()
    .withMessage('Current password is required'),
    
  body('newPassword')
    .trim()
    .notEmpty()
    .withMessage('New password is required')
    .isString()
    .isLength({ min: passwordRules.minLength })
    .withMessage(`Password must be at least ${passwordRules.minLength} characters long`)
    .isLength({ max: passwordRules.maxLength })
    .withMessage(`Password must not exceed ${passwordRules.maxLength} characters`)
    .matches(passwordRules.passwordPatterns.uppercase)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(passwordRules.passwordPatterns.lowercase)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(passwordRules.passwordPatterns.numbers)
    .withMessage('Password must contain at least one number')
    .matches(passwordRules.passwordPatterns.specialChars)
    .withMessage('Password must contain at least one special character')
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
    
  body('passwordConfirmation')
    .trim()
    .notEmpty()
    .withMessage('Password confirmation is required')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

module.exports = {
  validateForgotPassword,
  validateResetPassword,
  verifyTokenValidator,
  validateChangePassword,
  passwordRules
};