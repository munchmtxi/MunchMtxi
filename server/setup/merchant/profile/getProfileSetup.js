// server/setup/merchant/profile/getProfileSetup.js
const { Router } = require('express');
const authMiddleware = require('@middleware/authMiddleware');
const { getProfile } = require('@controllers/merchant/profile/getProfile');
const { logger } = require('@utils/logger');

const setupGetProfile = (app) => {
  const merchantProfileRouter = Router();

  // Log entry and enforce scope
  merchantProfileRouter.use((req, res, next) => {
    logger.info('Merchant profile router hit', { method: req.method, url: req.url, path: req.path });

    // Bypass middleware for non-/profile paths
    if (req.path !== '/profile' && !req.path.startsWith('/profile/')) {
      logger.info('Bypassing profile middleware for non-profile route', { path: req.path });
      return next('route'); // Skip to next router in the stack (e.g., /merchant/products)
    }

    next();
  });

  // Apply auth middleware only for /profile routes
  merchantProfileRouter.use(authMiddleware.validateToken);
  merchantProfileRouter.use(authMiddleware.restrictTo('merchant', 'admin'));

  // Define the profile endpoint
  merchantProfileRouter.get('/profile', (req, res, next) => {
    logger.info('Reached /merchant/profile endpoint', { user: req.user });
    getProfile(req, res, next);
  });

  // Mount at /merchant
  app.use('/merchant', merchantProfileRouter);
  logger.info('Merchant get profile routes mounted at /merchant/profile');
};

module.exports = { setupGetProfile };