// server/setup/merchant/profile/getProfileSetup.js or inline in startServer.js
const { Router } = require('express');
const authMiddleware = require('@middleware/authMiddleware');
const { getProfile } = require('@controllers/merchant/profile/getProfile');
const { logger } = require('@utils/logger');

const setupGetProfile = (app) => {
  const merchantProfileRouter = Router();

  merchantProfileRouter.use((req, res, next) => {
    logger.info('Merchant profile router hit', { method: req.method, url: req.url });
    next();
  });

  merchantProfileRouter.use(authMiddleware.validateToken);
  merchantProfileRouter.use(authMiddleware.restrictTo('merchant', 'admin'));

  merchantProfileRouter.get('/profile', (req, res, next) => {
    logger.info('Reached /merchant/profile endpoint', { user: req.user });
    getProfile(req, res, next);
  });

  app.use('/merchant', merchantProfileRouter); // Mount at /merchant, so /merchant/profile
  logger.info('Merchant get profile routes mounted at /merchant/profile');
};

module.exports = { setupGetProfile };