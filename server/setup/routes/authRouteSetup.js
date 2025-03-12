const express = require('express');
const bodyParser = require('body-parser');
const csrf = require('csurf');
const AuthRoutes = require('@routes/authRoutes');
const { logger } = require('@utils/logger');

logger.info('File loaded: authRouteSetup.js');

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

module.exports = {
  setupAuthRoutes: (app) => {
    logger.info('Setting up auth routes...');

    app.use(bodyParser.json({ limit: '10kb' }));
    app.use(bodyParser.urlencoded({ extended: true, limit: '10kb' }));
    app.use((req, res, next) => {
      logger.info('Body parsed', { body: req.body, method: req.method, path: req.path });
      next();
    });

    app.use((req, res, next) => {
      logger.info('CSRF Check', { path: req.path, originalUrl: req.originalUrl, method: req.method });
      // Bypass CSRF for /auth POST or curl requests
      if ((req.method === 'POST' && req.path.startsWith('/auth')) || 
          req.headers['user-agent']?.toLowerCase().includes('curl')) {
        logger.info('CSRF Bypassed', { originalUrl: req.originalUrl, userAgent: req.headers['user-agent'] });
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

    app.use('/auth', (req, res, next) => {
      logger.info('Auth route prefix hit', { path: req.path, method: req.method, body: req.body });
      next();
    }, AuthRoutes);

    logger.info('Auth routes mounted at /auth (includes /register, /login, /token, /merchant/login, /merchant/logout, /register-role)');
  }
};