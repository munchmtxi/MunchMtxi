// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// Base rate limit settings
const baseSettings = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  headers: true,
};

// Role-based rate limits
const roleLimits = {
  merchant: 100,
  customer: 50,
  driver: 75,
  staff: 150,
  admin: 200
};

// Create role-based rate limiter function
const checkRoleBasedRateLimit = (role) => {
  return rateLimit({
    ...baseSettings,
    max: roleLimits[role] || 50, // Default to 50 if role not found
    message: `Too many requests for ${role} role, please try again later.`,
    // Custom key generator to include role
    keyGenerator: (req) => {
      return `${req.ip}-${role}`;
    }
  });
};

// General rate limiter
const rateLimiter = rateLimit({
  ...baseSettings,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});

// Geo location specific limiter
const geoLocationLimiter = rateLimit({
  ...baseSettings,
  max: 100,
  message: 'Too many location detection requests, please try again later',
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for']
});

module.exports = {
  rateLimiter,
  geoLocationLimiter,
  checkRoleBasedRateLimit
};