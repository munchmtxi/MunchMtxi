'use strict';

const inventoryRoutes = require('@routes/merchant/products/inventoryRoutes');
const { logger } = require('@utils/logger');
const csrf = require('csurf');

const setupInventory = (app) => {
  // CSRF protection middleware
  const csrfProtection = csrf({
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Secure in production
      sameSite: 'strict',
    },
  });

  // Apply CSRF protection to inventory routes, but skip for curl requests
  app.use('/api/v1/merchants/inventory', (req, res, next) => {
    if (req.headers['user-agent']?.includes('curl')) {
      logger.info('CSRF skipped for curl request', { path: req.path });
      return next();
    }
    csrfProtection(req, res, next);
  });

  // Mount inventory routes
  app.use('/api/v1/merchants/inventory', inventoryRoutes);
  logger.info('Inventory routes mounted at /api/v1/merchants/inventory');

  // CSRF token endpoint (for clients to fetch CSRF token)
  app.get('/api/v1/csrf-token', csrfProtection, (req, res) => {
    res.status(200).json({
      status: 'success',
      csrfToken: req.csrfToken(),
    });
  });
  logger.info('CSRF token endpoint registered at /api/v1/csrf-token');
};

module.exports = setupInventory;