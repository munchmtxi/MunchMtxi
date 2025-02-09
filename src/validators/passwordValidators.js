// src/validators/passwordValidators.js

const { body, param } = require('express-validator');

// Password validation rules
const passwordRules = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

// Validate forgot password request
const validateForgotPassword = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Validate password reset request
const validateResetPassword = [
  param('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 21, max: 256 })
    .withMessage('Invalid token format'),
    
  body('newPassword')
    .isString()
    .isLength({ min: passwordRules.minLength })
    .withMessage(`Password must be at least ${passwordRules.minLength} characters long`)
    .isLength({ max: passwordRules.maxLength })
    .withMessage(`Password must not exceed ${passwordRules.maxLength} characters`)
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[a-z]/)
    .withMessage('Password must contain at least one lowercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/)
    .withMessage('Password must contain at least one special character'),
    
  body('passwordConfirmation')
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
    .isLength({ min: 21, max: 256 })
    .withMessage('Invalid token format')
];

module.exports = {
  validateForgotPassword,
  validateResetPassword,
  verifyTokenValidator,
  passwordRules
};