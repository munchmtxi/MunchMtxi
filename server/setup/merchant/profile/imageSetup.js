// server/setup/merchant/profile/imageSetup.js
'use strict';
const express = require('express');
const { protect, restrictTo } = require('@middleware/authMiddleware');
const { restrictToMerchantProfile } = require('@middleware/merchantMiddleware'); // New import
const { uploadImage, deleteImage } = require('@controllers/merchant/profile/imageController');
const { logger } = require('@utils/logger');

const setupMerchantImages = (app) => {
  logger.info('Setting up merchant image routes...');
  const router = express.Router();

  router.use((req, res, next) => {
    logger.info('API merchant image router hit', { method: req.method, url: req.url });
    next();
  });

  // Apply middleware stack
  router.use(protect);                    // Authenticate user
  router.use(restrictTo('merchant'));     // Restrict to merchant role (roleId: 19)
  router.use(restrictToMerchantProfile);  // Ensure merchant profile exists

  router.route('/')
    .post(uploadImage);

  router.route('/:imageType')
    .delete(deleteImage);

  app.use('/api/merchant/profile/images', router);
  logger.info('Merchant image routes mounted at /api/merchant/profile/images');
};

module.exports = { setupMerchantImages };