const express = require('express');
const bodyParser = require('body-parser');
const csrf = require('csurf');
const AuthRoutes = require('@routes/authRoutes');
const { logger } = require('@utils/logger');

// Log file loading for debugging
logger.info('File loaded: authRouteSetup.js');

// Initialize CSRF protection with cookie options
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Secure cookies in production
    sameSite: 'strict'
  }
});

module.exports = {
  setupAuthRoutes: (app) => {
    logger.info('Setting up auth routes...');

    // Ensure body parsing is applied before CSRF or routes
    app.use(bodyParser.json({ limit: '10kb' })); // Add limit for security
    app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));
    app.use((req, res, next) => {
      logger.info('Body parsed', { body: req.body, method: req.method, path: req.path });
      next();
    });

    // CSRF middleware with explicit bypass for /auth POST requests
    app.use((req, res, next) => {
      logger.info('CSRF Check', { path: req.path, originalUrl: req.originalUrl, method: req.method });
      if (req.method === 'POST' && req.path.startsWith('/auth')) {
        logger.info('CSRF Bypassed', { originalUrl: req.originalUrl });
        return next();
      }
      csrfProtection(req, res, (err) => {
        if (err) {
          logger.error('CSRF middleware error', { error: err.message, stack: err.stack });
          return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
        }
        logger.info('CSRF validated', { path: req.path });
        next();
      });
    });

    // Debug middleware before mounting AuthRoutes
    app.use('/auth', (req, res, next) => {
      logger.info('Auth route prefix hit', { path: req.path, method: req.method, body: req.body });
      next();
    }, AuthRoutes);

    // Confirm routes are mounted with specific endpoints
    logger.info('Auth routes mounted at /auth (includes /register, /login, /token, /merchant/login, /merchant/logout, /register-role)');
  }
};