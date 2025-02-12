const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Redis = require('redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const { AppError } = require('../utils/AppError');

// Rate limiters for different endpoints
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
});

const defaultLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many requests from this IP, please try again later'
);

const authLimiter = createRateLimiter(
  60 * 60 * 1000, // 1 hour
  5,
  'Too many login attempts from this IP, please try again after an hour'
);

const geoLocationLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100,
  'Too many location detection requests, please try again later'
);

// Permission validator
const validatePermissions = (requiredPermission) => async (req, res, next) => {
  const { user } = req;

  if (!user) {
    return next(new AppError('Authentication required', 401));
  }

  if (!user.hasPermission(requiredPermission)) {
    return next(new AppError('Insufficient permissions', 403));
  }

  next();
};

// Location-specific permission validator
const validateLocationPermissions = async (req, res, next) => {
  const { user } = req;
  const action = req.method === 'POST' ? 'update' : 'read';

  if (!user.hasPermission(`location.${action}`)) {
    return next(new AppError('Insufficient permissions', 403));
  }

  next();
};

// Dynamic rate limiting middleware
const dynamicRateLimiter = (redisClient) => {
  const rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    points: 100, // Number of points
    duration: 60, // Per 60 seconds
    blockDuration: 60 * 15, // Block for 15 minutes
    keyPrefix: 'rl_',
  });

  return async (req, res, next) => {
    try {
      const pointsToConsume = await calculatePointsForRequest(req);
      await rateLimiter.consume(req.ip, pointsToConsume);
      next();
    } catch (error) {
      res.status(429).json({
        error: 'Too Many Requests',
        retryAfter: Math.ceil(error.msBeforeNext / 1000),
      });
    }
  };
};

// XSS Middleware
const xssMiddleware = (req, res, next) => {
  const sanitizeString = (str) => {
    return str.replace(/<script[^>]*?>.*?<\/script>/gi, ''); // Remove script tags
  };

  const sanitizeObject = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }
  };

  if (req.body) sanitizeObject(req.body);
  if (req.query) sanitizeObject(req.query);
  if (req.params) sanitizeObject(req.params);

  next();
};

// Security middleware setup
module.exports = function securityMiddleware(app) {
  // Initialize Redis client for dynamic rate limiting
  const redisClient = Redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  // Security headers with enhanced CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.nonce}'` // Dynamically add nonce for inline scripts
        ],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
        reportUri: '/api/csp-report', // Updated to use the new CSP reporting endpoint
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: { allow: false },
    expectCt: { enforce: true, maxAge: 30 },
    frameguard: { action: 'deny' },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true,
  }));

  // Apply default rate limiter
  app.use(defaultLimiter);

  // Apply endpoint-specific rate limiters
  app.use('/api/auth/login', authLimiter);
  app.use('/api/location', geoLocationLimiter);

  // Add IP whitelist middleware
  const whitelistedIPs = new Set(process.env.WHITELISTED_IPS?.split(',') || []);
  app.use((req, res, next) => {
    if (whitelistedIPs.has(req.ip)) {
      return next(); // Whitelisted IPs bypass all rate limits
    }
    dynamicRateLimiter(redisClient)(req, res, next); // Fallback to dynamic rate limiting
  });

  // JSON body parser with size limits
  app.use(express.json({
    limit: '10kb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        throw new AppError('Invalid JSON payload', 400);
      }
    },
  }));

  // XSS Middleware
  app.use(xssMiddleware);

  // Request validation middleware
  app.use((req, res, next) => {
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = req.query[key].trim();
        }
      });
    }

    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-type'] !== 'application/json') {
      return next(new AppError('Content-Type must be application/json', 415));
    }

    next();
  });

  // Security response headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
    next();
  });

  // CSP Reporting Endpoint
  app.post('/api/csp-report', (req, res) => {
    const report = req.body;
    console.warn('CSP Violation:', report); // Log the violation
    res.status(204).end();
  });

  // Error handler for security violations
  app.post('/report-violation', (req, res) => {
    if (req.body) {
      console.log('CSP Violation (Legacy):', req.body);
    }
    res.status(204).end();
  });
};

// Export individual components for use in other parts of the application
module.exports.validatePermissions = validatePermissions;
module.exports.validateLocationPermissions = validateLocationPermissions;
module.exports.rateLimiters = {
  defaultLimiter,
  authLimiter,
  geoLocationLimiter,
};