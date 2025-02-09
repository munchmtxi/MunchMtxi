// middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  headers: true,
});

const geoLocationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many location detection requests, please try again later',
  keyGenerator: (req) => req.ip || req.headers['x-forwarded-for']
});

module.exports = { rateLimiter, geoLocationLimiter };
