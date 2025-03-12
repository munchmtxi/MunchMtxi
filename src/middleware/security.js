const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Redis = require('redis');
const { RateLimiterRedis } = require('rate-limiter-flexible');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const { AppError } = require('@utils/AppError');
const { logger } = require('@utils/logger');

// Rate limiter setup
const createRateLimiter = (windowMs, max, message) => rateLimit({
  windowMs,
  max,
  message: { error: message },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', { ip: req.ip, path: req.path, method: req.method });
    res.status(429).json({ error: message });
  }
});

const defaultLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many requests from this IP');
const authLimiter = createRateLimiter(60 * 60 * 1000, 5, 'Too many login attempts');
const geoLocationLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many location requests');

// Permission validation (unchanged)
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

const validateLocationPermissions = async (req, res, next) => {
  const { user } = req;
  const action = req.method === 'POST' || req.method === 'PUT' ? 'update' : 'read';
  if (!user) return next(new AppError('Authentication required', 401));
  const requiredPermission = `location.${action}`;
  if (!user.hasPermission(requiredPermission)) {
    logger.warn('Location permission denied', { userId: user.id, permission: requiredPermission });
    return next(new AppError(`Insufficient permissions for ${action} location`, 403));
  }
  next();
};

// Dynamic rate limiter (unchanged)
const calculatePointsForRequest = (req) => {
  const isMutating = ['POST', 'PUT', 'PATCH'].includes(req.method);
  const isAuthenticated = !!req.user;
  return isMutating ? (isAuthenticated ? 5 : 3) : (isAuthenticated ? 2 : 1);
};

// XSS protection (unchanged)
const xssMiddleware = () => (req, res, next) => {
  const sanitizeString = (str) => typeof str === 'string' ? str.replace(/<script[^>]*?>.*?<\/script>/gi, '') : str;
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key in obj) {
      if (typeof obj[key] === 'string') obj[key] = sanitizeString(obj[key]);
      else if (typeof obj[key] === 'object') sanitizeObject(obj[key]);
    }
  };
  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  next();
};

// Core security headers (unchanged)
const setupSecurity = () => (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  logger.debug('Security headers applied', { path: req.path, method: req.method });
  next();
};

// Main security middleware
function securityMiddleware(app) {
  const redisClient = Redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
  redisClient.on('error', (err) => logger.error('Redis Client Error:', { error: err.message }));

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
    }
  }));

  app.use(defaultLimiter);
  app.use('/auth/login', authLimiter);
  app.use('/api/location', geoLocationLimiter);

  const whitelistedIPs = new Set(process.env.WHITELISTED_IPS?.split(',') || []);
  app.use((req, res, next) => {
    if (whitelistedIPs.has(req.ip)) {
      logger.debug('Whitelisted IP bypassed rate limit', { ip: req.ip });
      return next();
    }
    const rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      points: 100,
      duration: 60,
      blockDuration: 15 * 60,
      keyPrefix: 'rl_'
    });
    rateLimiter.consume(req.ip, calculatePointsForRequest(req))
      .then(() => next())
      .catch((error) => {
        logger.warn('Dynamic rate limit exceeded', { ip: req.ip, msBeforeNext: error.msBeforeNext });
        res.status(429).json({ error: 'Rate limit exceeded', retryAfter: Math.ceil(error.msBeforeNext / 1000) });
      });
  });

  app.use(express.json({ limit: '10kb' }));
  app.use((req, res, next) => {
    logger.info('CSRF Check', { path: req.path, method: req.method });
    // Bypass CSRF for curl globally
    if (req.headers['user-agent']?.toLowerCase().includes('curl')) {
      logger.info('CSRF bypassed for curl request', { method: req.method, url: req.originalUrl });
      return next();
    }
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || req.path.startsWith('/auth')) {
      logger.info('CSRF Bypassed', { originalUrl: req.originalUrl });
      return next();
    }
    csrf({ cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' } })(req, res, next);
  });

  app.use(xssMiddleware());
  app.use(setupSecurity());

  app.post('/api/csp-report', (req, res) => {
    logger.warn('CSP Violation Reported', { report: req.body });
    res.status(204).end();
  });
}

module.exports = securityMiddleware;
module.exports.validatePermissions = validatePermissions;
module.exports.validateLocationPermissions = validateLocationPermissions;
module.exports.setupSecurity = setupSecurity;
module.exports.rateLimiters = { defaultLimiter, authLimiter, geoLocationLimiter };