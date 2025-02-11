// src/routes/passwordRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import using module aliases
const passwordController = require('@controllers/passwordController');
const {
  validateForgotPassword,
  validateResetPassword,
  verifyTokenValidator
} = require('@validators/passwordValidators');
const { validateRequest } = require('@middleware/validateRequest');

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

// Route for initiating password reset
router.post(
  '/forgot-password', 
  passwordLimiter,
  validateForgotPassword,
  validateRequest,  // No need to pass schema since we're using express-validator
  passwordController.forgotPassword
);

// Route for completing password reset
router.post(
  '/reset-password/:token', 
  passwordLimiter,
  validateResetPassword,
  validateRequest,
  passwordController.resetPassword
);

// Route for verifying reset token
router.get(
  '/verify-token/:token',
  passwordLimiter,
  verifyTokenValidator,
  validateRequest,
  passwordController.verifyResetToken
);

module.exports = router;