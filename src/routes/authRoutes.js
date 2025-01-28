// src/routes/authRoutes.js
const express = require('express');
const { register, login, refreshToken, registerNonCustomer } = require('../controllers/authController');
const { validateRegister, validateLogin, validateRegisterNonCustomer } = require('../validators/authValidators');
const rateLimit = require('express-rate-limit');
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

router.use(authLimiter);

// Public Routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);

// Refresh Token Route
router.post('/token', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many token refresh attempts from this IP, please try again later.',
}), refreshToken);

// Admin-Only Registration for Non-Customer Roles
router.post('/register-role', 
  authenticate, 
  authorizeRoles('Admin'), 
  validateRegisterNonCustomer, 
  registerNonCustomer
);

module.exports = router;
