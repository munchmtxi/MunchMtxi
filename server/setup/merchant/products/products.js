// server/setup/merchant/products/products.js
const express = require('express');
const csrf = require('csurf');
const productRoutes = require('@routes/merchant/products/productRoutes');
const { logger } = require('@utils/logger');

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

const setupMerchantProducts = (app) => {
  const merchantProductRouter = express.Router();

  merchantProductRouter.use((req, res, next) => {
    logger.info(`🚪 Entering products router: ${req.method} ${req.path}`);
    if (req.headers['user-agent']?.toLowerCase().includes('curl')) {
      logger.info('🌀 CSRF skipped for curl');
      return next();
    }
    if (req.method === 'GET' || req.path === '/bulk-upload') {
      logger.info('🌀 CSRF skipped for safe method/bulk upload');
      return next();
    }
    csrfProtection(req, res, (err) => {
      if (err) {
        logger.error(`🚨 CSRF failed: ${err.message}`);
        return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
      }
      logger.info('✅ CSRF passed');
      next();
    });
  });

  merchantProductRouter.use('/', productRoutes); // Root of this router
  app.use('/merchant/products', merchantProductRouter); // Explicit mount

  logger.info('🛍️ Products mounted at /merchant/products');
};

module.exports = setupMerchantProducts;