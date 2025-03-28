'use strict';

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
    sameSite: 'strict',
  },
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

    // CSRF token endpoint (public, no CSRF protection needed here)
    app.get('/csrf-token', csrfProtection, (req, res) => {
      try {
        const csrfToken = req.csrfToken();
        logger.info('CSRF token generated', { token: csrfToken });
        res.json({ csrfToken });
      } catch (err) {
        logger.error('CSRF token generation failed', { error: err.message, stack: err.stack });
        res.status(500).json({ status: 'error', message: 'Failed to generate CSRF token' });
      }
    });

    // Apply CSRF protection globally, with exceptions
    app.use((req, res, next) => {
      logger.info('CSRF Check', { path: req.path, method: req.method });
      if (
        req.method === 'OPTIONS' || // Bypass OPTIONS for CORS preflight
        (req.method === 'POST' && req.path.startsWith('/auth')) ||
        req.method === 'GET' ||
        req.headers['user-agent']?.toLowerCase().includes('curl')
      ) {
        logger.info('CSRF Bypassed', { path: req.path, userAgent: req.headers['user-agent'] });
        return next();
      }
      csrfProtection(req, res, (err) => {
        if (err) {
          logger.error('CSRF validation failed', { error: err.message, stack: err.stack });
          return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
        }
        logger.info('CSRF validated', { path: req.path });
        next();
      });
    });

    app.use('/auth', AuthRoutes);
    logger.info('Auth routes mounted at /auth');
  },
};