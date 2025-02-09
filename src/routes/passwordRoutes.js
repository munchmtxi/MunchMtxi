// src/routes/passwordRoutes.js

const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import using module aliases
const passwordController = require('@controllers/passwordController');
const passwordValidators = require('@validators/passwordValidators');
const validateRequest = require('@middleware/validateRequest');

// Rate limiter for password routes
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    status: 'error',
    message: 'Too many password reset attempts from this IP, please try again later.',
    timestamp: new Date().toISOString()
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Debug logging
console.log('Route components:', {
  validateRequest: typeof validateRequest === 'function' ? 'function' : typeof validateRequest,
  controllerMethods: Object.keys(passwordController),
  validators: Object.keys(passwordValidators)
});

// Route for initiating password reset
router.post(
  '/forgot-password', 
  passwordLimiter,
  [...passwordValidators.validateForgotPassword],
  validateRequest,
  passwordController.forgotPassword
);

// Route for completing password reset
router.post(
  '/reset-password/:token', 
  passwordLimiter,
  [...passwordValidators.validateResetPassword],
  validateRequest,
  passwordController.resetPassword
);

// Route for verifying reset token
router.get(
  '/verify-token/:token',
  passwordLimiter,
  [...passwordValidators.verifyTokenValidator],
  validateRequest,
  passwordController.verifyResetToken
);

module.exports = router;