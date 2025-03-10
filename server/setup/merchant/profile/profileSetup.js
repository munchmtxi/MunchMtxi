// server/setup/merchant/profile/profileSetup.js
'use strict';

const express = require('express');
const profileController = require('@controllers/merchant/profile/profileController');
const { authenticate, restrictTo } = require('@middleware/authMiddleware');
const { logger } = require('@utils/logger');

module.exports = {
  setupMerchantProfile: (app) => {
    logger.info('Setting up merchant profile routes...');

    const router = express.Router();

    // Apply authentication and role restriction to all routes
    router.use(authenticate);
    router.use(restrictTo('merchant'));

    // Profile management routes
    router.route('/')
      .get(profileController.getProfile) // Optional: Another way to get profile
      .patch(profileController.updateProfile);

    router.patch('/business-hours', profileController.updateBusinessHours);
    router.patch('/delivery-settings', profileController.updateDeliverySettings);

    router.route('/branches')
      .post(profileController.createBranch);

    router.route('/branches/:branchId')
      .patch(profileController.updateBranch);

    // Mount at /api/merchant/profile
    app.use('/api/merchant/profile', router);
    logger.info('Merchant profile routes mounted at /api/merchant/profile');
  },
};