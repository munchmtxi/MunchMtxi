'use strict';
const express = require('express');
const { protect, restrictTo } = require('@middleware/authMiddleware');
const BusinessTypeController = require('@controllers/merchant/profile/businessTypeController');
const { logger } = require('@utils/logger');

const setupBusinessType = (app) => {
  const router = express.Router();

  router.use(protect);
  router.use(restrictTo('merchant'));

  router.route('/')
    .get(BusinessTypeController.getBusinessType) // Updated to getBusinessType
    .put(BusinessTypeController.updateBusinessType);

  router.get('/requirements/:type', BusinessTypeController.getBusinessTypeRequirements); // Adjusted param name for consistency

  // Mount the router on the app
  app.use('/api/merchant/profile/business-type', router);
  logger.info('Business type routes mounted at /api/merchant/profile/business-type');
};

module.exports = { setupBusinessType };