'use strict';

const express = require('express');
const csrf = require('csurf');
const reservationRoutes = require('@routes/merchant/reservation/reservationRoutes');
const { logger } = require('@utils/logger');
const config = require('@config/config');

/**
 * Sets up reservation routes with CSRF protection for merchant-related endpoints.
 * @param {express.Application} app - The Express application instance.
 */
const setupReservationRoutes = (app) => {
  const csrfProtection = csrf({
    cookie: {
      key: '_csrf',
      secure: config.nodeEnv === 'production',
      httpOnly: true,
      sameSite: 'strict',
    },
  });

  const router = express.Router();

  logger.info('Setting up merchant reservation routes under /reservation');

  router.use((req, res, next) => {
    logger.info('Entering reservation router middleware', { path: req.path, method: req.method });
    if (req.headers['user-agent']?.toLowerCase().includes('curl')) {
      logger.info('CSRF bypassed for curl in reservation routes', { path: req.path, method: req.method });
      req.skipCsrf = true; // Flag to track bypass
      return next();
    }
    if (req.method === 'POST') {
      logger.info('Applying CSRF protection for POST', { path: req.path });
      csrfProtection(req, res, (err) => {
        if (err) {
          logger.error('CSRF validation failed in setup', { error: err.message, method: req.method, path: req.path });
          return res.status(403).json({
            status: 'fail',
            message: 'Invalid CSRF token',
            errorCode: 'INVALID_CSRF',
          });
        }
        logger.info('CSRF passed in setup', { path: req.path });
        next();
      });
    } else {
      logger.info('Skipping CSRF for non-POST', { path: req.path, method: req.method });
      next();
    }
  });

  router.use('/reservation', (req, res, next) => {
    logger.info('Entering /reservation sub-route', { path: req.path, method: req.method, skipCsrf: !!req.skipCsrf });
    next();
  }, reservationRoutes);

  router.get('/csrf-token', csrfProtection, (req, res) => {
    logger.info('CSRF token requested', { ip: req.ip });
    res.status(200).json({
      status: 'success',
      data: { csrfToken: req.csrfToken() },
    });
  });

  app.use('/api/merchant', (req, res, next) => {
    logger.info('Mounting reservation router at /api/merchant', { path: req.path, method: req.method, skipCsrf: !!req.skipCsrf });
    next();
  }, router);

  logger.info('Merchant reservation routes successfully mounted with CSRF protection');
};

module.exports = setupReservationRoutes;