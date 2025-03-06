// server/setup/merchant/profile/getProfileSetup.js
'use strict';

const express = require('express');
const GetProfileService = require('@services/merchant/profile/getProfileService');
const { protect, restrictTo } = require('@middleware/authMiddleware');
const catchAsync = require('@utils/catchAsync');
const { logger } = require('@utils/logger');

module.exports = {
  setupGetProfile: (app) => {
    logger.info('File loaded: getProfileSetup.js');
    logger.info('Setting up merchant get profile routes...');

    const router = express.Router();

    router.get(
      '/:merchantId',
      protect, // Ensures JWT authentication
      restrictTo('merchant'), // Restricts to 'merchant' role
      catchAsync(async (req, res) => {
        const merchantId = req.params.merchantId;
        const profile = await GetProfileService.execute(merchantId);

        res.status(200).json({
          status: 'success',
          data: profile,
        });
      })
    );

    app.use('/merchant-profiles', router);
    logger.info('Merchant get profile routes mounted at /merchant-profiles');
  },
};