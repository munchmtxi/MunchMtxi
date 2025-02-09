const express = require('express');

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
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

module.exports = function securityMiddleware(app) {
  // Security headers with enhanced CSP
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "https:"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
        sandbox: ['allow-forms', 'allow-scripts', 'allow-same-origin'],
        reportUri: '/report-violation',
        frameAncestors: ["'none'"]
      }
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
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
  }));

  // Apply rate limiters
  app.use(defaultLimiter);
  app.use('/api/auth/login', authLimiter);
  app.use('/api/location', geoLocationLimiter);

  // JSON body parser with size limits
  app.use(express.json({ 
    limit: '10kb',
    verify: (req, res, buf) => {
      try {
        JSON.parse(buf);
      } catch (e) {
        throw new AppError('Invalid JSON payload', 400);
      }
    }
  }));

  // Request validation middleware
  app.use((req, res, next) => {
    // Sanitize query parameters
    if (req.query) {
      Object.keys(req.query).forEach(key => {
        if (typeof req.query[key] === 'string') {
          req.query[key] = req.query[key].trim();
        }
      });
    }

    // Validate content type for POST/PUT/PATCH requests
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

  // Error handler for security violations
  app.post('/report-violation', (req, res) => {
    if (req.body) {
      console.log('CSP Violation:', req.body);
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
  geoLocationLimiter
};