// server/setup/merchant/profile/profileSetup.js
const express = require('express');
const profileController = require('@controllers/merchant/profile/profileController');
const { authenticate, restrictTo } = require('@middleware/authMiddleware');
const { logger } = require('@utils/logger');

module.exports = {
  setupMerchantProfile: (app) => {
    logger.info('Setting up merchant profile routes...');
    const router = express.Router();

    router.use((req, res, next) => {
      logger.info('API merchant profile router hit', { method: req.method, url: req.url });
      next();
    });

    router.use(authenticate);
    router.use(restrictTo('merchant'));

    router.get('/', profileController.getProfile);
    router.patch('/', profileController.updateProfile);
    router.patch('/business-hours', profileController.updateBusinessHours);
    router.patch('/delivery-settings', profileController.updateDeliverySettings);
    router.post('/branches', profileController.createBranch);
    router.patch('/branches/:branchId', profileController.updateBranch);

    app.use('/api/merchant/profile', router);
    logger.info('Merchant profile routes mounted at /api/merchant/profile');
  },
};