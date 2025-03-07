// src/middleware/security.js
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Redis = require('redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const { AppError } = require('@utils/AppError');
const { logger } = require('@utils/logger');

/**
 * Security middleware utilities for protecting Express applications.
 * @module securityMiddleware
 */

/**
 * Configuration options for rate limiters.
 * @typedef {Object} RateLimitConfig
 * @property {number} windowMs - Time window in milliseconds.
 * @property {number} max - Maximum number of requests allowed in the window.
 * @property {string} message - Error message for exceeding the limit.
 */

/**
 * Creates a rate limiter with specified options.
 * @function createRateLimiter
 * @param {number} windowMs - Time window in milliseconds.
 * @param {number} max - Maximum number of requests.
 * @param {string} message - Custom message for rate limit exceeded.
 * @returns {import('express-rate-limit').RateLimitRequestHandler} Rate limiter middleware.
 */
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path, method: req.method });
    res.status(429).json(options.message);
  }
});

/**
 * Default rate limiter for general endpoints.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const defaultLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many requests from this IP, please try again after 15 minutes'
);

/**
 * Rate limiter for authentication endpoints.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const authLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  'Too many login attempts from this IP, please try again after an hour'
);

/**
 * Rate limiter for geolocation endpoints.
 * @type {import('express-rate-limit').RateLimitRequestHandler}
 */
const geoLocationLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many location requests from this IP, please try again after 15 minutes'
);

/**
 * Validates user permissions for a specific action.
 * @function validatePermissions
 * @param {string} requiredPermission - The permission required (e.g., 'user.read').
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Checks if the authenticated user has the required permission.
 */
const validatePermissions = (requiredPermission) => async (req, res, next) => {
  const { user } = req;

  if (!user) {
    logger.warn('Unauthenticated access attempt', { path: req.path, method: req.method });
    return next(new AppError('Authentication required', 401));
  }

  if (!user.hasPermission || typeof user.hasPermission !== 'function') {
    logger.error('User object missing hasPermission method', { userId: user.id });
    return next(new AppError('Internal server error', 500));
  }

  if (!user.hasPermission(requiredPermission)) {
    logger.warn('Permission denied', { userId: user.id, permission: requiredPermission });
    return next(new AppError(`Insufficient permissions: ${requiredPermission} required`, 403));
  }

  logger.debug('Permission validated', { userId: user.id, permission: requiredPermission });
  next();
};

/**
 * Validates location-specific permissions based on request method.
 * @function validateLocationPermissions
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Ensures user has permission for location read/update actions.
 */
const validateLocationPermissions = async (req, res, next) => {
  const { user } = req;
  const action = req.method === 'POST' || req.method === 'PUT' ? 'update' : 'read';

  if (!user) {
    return next(new AppError('Authentication required', 401));
  }

  const requiredPermission = `location.${action}`;
  if (!user.hasPermission(requiredPermission)) {
    logger.warn('Location permission denied', { userId: user.id, permission: requiredPermission });
    return next(new AppError(`Insufficient permissions for ${action} location`, 403));
  }

  next();
};

/**
 * Dynamic rate limiter using Redis for fine-grained control.
 * @function dynamicRateLimiter
 * @param {Redis.RedisClient} redisClient - Redis client instance.
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Limits requests based on IP with configurable points.
 */
const dynamicRateLimiter = (redisClient) => {
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    points: 100, // Max points
    duration: 60, // 60 seconds
    blockDuration: 15 * 60, // Block for 15 minutes
    keyPrefix: 'rl_'
  });

  return async (req, res, next) => {
    try {
      const pointsToConsume = calculatePointsForRequest(req);
      await rateLimiter.consume(req.ip, pointsToConsume);
      logger.debug('Rate limit passed', { ip: req.ip, points: pointsToConsume });
      next();
    } catch (error) {
      logger.warn('Dynamic rate limit exceeded', { ip: req.ip, msBeforeNext: error.msBeforeNext });
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil(error.msBeforeNext / 1000)
      });
    }
  };
};

/**
 * Calculates points to consume based on request characteristics.
 * @function calculatePointsForRequest
 * @param {import('express').Request} req - The incoming request.
 * @returns {number} Points to consume (1-5).
 * @description Assigns higher points to POST/PUT requests or authenticated users.
 */
const calculatePointsForRequest = (req) => {
  const isMutating = ['POST', 'PUT', 'PATCH'].includes(req.method);
  const isAuthenticated = !!req.user;
  return isMutating ? (isAuthenticated ? 5 : 3) : (isAuthenticated ? 2 : 1);
};

/**
 * Middleware to sanitize requests against XSS attacks.
 * @function xssMiddleware
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Removes script tags and sanitizes request data.
 */
const xssMiddleware = () => (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str
      .replace(/<script[^>]*?>.*?<\/script>/gi, '')
      .replace(/[<>&;]/g, c => `&#${c.charCodeAt(0)};`);
  };

  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }
  };

  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  next();
};

/**
 * Sets up core security configurations for the application.
 * @function setupSecurity
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Applies baseline security headers and configurations.
 */
const setupSecurity = () => (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  logger.debug('Security headers applied', { path: req.path, method: req.method });
  next();
};

/**
 * Sets up comprehensive security middleware for an Express application.
 * @function securityMiddleware
 * @param {import('express').Express} app - The Express application instance.
 * @description Applies helmet, rate limiting, CSRF protection, and other security measures.
 */
module.exports = function securityMiddleware(app) {
  const redisClient = Redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });

  redisClient.on('error', (err) => {
    logger.error('Redis Client Error:', { error: err.message, stack: err.stack });
  });

  app.use(cookieParser());
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.example.com"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        reportUri: '/api/csp-report'
      }
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  app.use(defaultLimiter);
  app.use('/api/auth/login', authLimiter); // Should be /auth/login to match authRoutes.js
  app.use('/api/location', geoLocationLimiter);

  const whitelistedIPs = new Set(process.env.WHITELISTED_IPS?.split(',') || []);
  app.use((req, res, next) => {
    if (whitelistedIPs.has(req.ip)) {
      logger.debug('Whitelisted IP bypassed rate limit', { ip: req.ip });
      return next();
    }
    dynamicRateLimiter(redisClient)(req, res, next);
  });

  app.use(express.json({
    limit: '10kb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        logger.warn('Invalid JSON payload', { ip: req.ip, method: req.method, path: req.path });
        throw new AppError('Invalid JSON payload', 400);
      }
    }
  }));

  const csrfProtection = csrf({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' } });
  app.use((req, res, next) => {
    logger.info('CSRF Check', { path: req.path, originalUrl: req.originalUrl, method: req.method });
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.originalUrl.startsWith('/auth')) {
      logger.info('CSRF Bypassed', { originalUrl: req.originalUrl });
      return next();
    }
    logger.info('CSRF Applied', { originalUrl: req.originalUrl });
    csrfProtection(req, res, next);
  });

  app.use(xssMiddleware());
  app.use(setupSecurity());

  app.use((req, res, next) => {
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') req.query[key] = req.query[key].trim();
      });
    }
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-type'] !== 'application/json') {
      return next(new AppError('Content-Type must be application/json', 415));
    }
    next();
  });

  app.post('/api/csp-report', (req, res) => {
    logger.warn('CSP Violation Reported', { report: req.body });
    res.status(204).end();
  });
};

// Export individual components
module.exports.validatePermissions = validatePermissions;
module.exports.validateLocationPermissions = validateLocationPermissions;
module.exports.setupSecurity = setupSecurity;
module.exports.rateLimiters = { defaultLimiter, authLimiter, geoLocationLimiter };