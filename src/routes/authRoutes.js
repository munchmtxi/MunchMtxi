const express = require('express');
const { 
  register, 
  login, 
  refreshToken, 
  registerNonCustomer,
  merchantLogin,
  logout,
  driverLogin, // New import
  driverLogout // New import
} = require('@controllers/authController');
const { 
  validateRegister, 
  validateLogin,
  validateRegisterNonCustomer,
  validateMerchantLogin,
  validateMerchantLogout,
  validateDriverLogin, // New import
  validateDriverLogout // New import
} = require('@validators/authValidators');
const rateLimit = require('express-rate-limit');
const { 
  authenticate, 
  authorizeRoles 
} = require('@middleware/authMiddleware');
const { logger } = require('@utils/logger');

const router = express.Router();

// Rate limiter for auth routes (15 minutes, 100 requests per IP)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// Rate limiter for token refresh (15 minutes, 50 requests per IP)
const refreshTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many token refresh attempts from this IP, please try again later.',
});

// Apply rate limiter to all auth routes
router.use(authLimiter);

// Register a new customer
router.post('/register', validateRegister, register);

// Log in a user (general login)
router.post('/login', validateLogin, login);

// Refresh JWT access token
router.post('/token', refreshTokenLimiter, refreshToken);

// Register a non-customer user (Admin only)
router.post(
  '/register-role',
  authenticate,
  authorizeRoles(1), // Use role_id: 1 for Admin, adjust as needed
  validateRegisterNonCustomer,
  registerNonCustomer
);

// Log in a merchant with logging middleware
router.post('/merchant/login', (req, res, next) => {
  logger.info('DEFINITELY REACHED MERCHANT LOGIN ROUTE', { body: req.body });
  next();
}, validateMerchantLogin, merchantLogin);

// Log out a merchant
router.post(
  '/merchant/logout',
  authenticate,
  authorizeRoles(19), // Use role_id: 19 for Merchant, adjust as needed
  validateMerchantLogout,
  logout
);

// Log in a driver
router.post('/driver/login', validateDriverLogin, driverLogin);

// Log out a driver
router.post(
  '/driver/logout',
  authenticate,
  authorizeRoles(3), // Use role_id: 3 for Driver, adjust as needed
  validateDriverLogout,
  driverLogout
);

module.exports = router;