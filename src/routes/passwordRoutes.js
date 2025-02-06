const express = require('express');
const { 
  forgotPassword, 
  resetPassword 
} = require('@controllers/passwordController');
const { 
  validateForgotPassword, 
  validateResetPassword 
} = require('@validators/passwordValidators');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter for password routes
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many password reset attempts from this IP, please try again later.',
});

router.post('/forgot-password', 
  passwordLimiter, 
  validateForgotPassword, 
  forgotPassword
);

router.post('/reset-password', 
  passwordLimiter, 
  validateResetPassword, 
  resetPassword
);

module.exports = router;