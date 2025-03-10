// Original server/setup/merchant/profile/getProfileSetup.js
'use strict';
const express = require('express');
const { merchantProfileController } = require('@controllers/merchant/merchantProfileController');
const authMiddleware = require('@middleware/auth');
const { logger } = require('@utils/logger');

module.exports = {
  setupGetProfile: (app) => {
    const merchantProfileRouter = express.Router();
    merchantProfileRouter.use(authMiddleware.verifyToken);
    merchantProfileRouter.use(authMiddleware.checkRole(['MERCHANT', 'ADMIN']));
    merchantProfileRouter.get('/merchant/profile', merchantProfileController.getProfile);
    app.use('/', merchantProfileRouter);
    logger.info('Merchant get profile routes mounted');
  }
};