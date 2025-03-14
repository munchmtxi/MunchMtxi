// src/middleware/merchantMiddleware.js
'use strict';
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const models = require('@models'); // Adjust based on export

const restrictToMerchantProfile = async (req, res, next) => {
  if (!req.user) {
    logger.warn('restrictToMerchantProfile: No user found in request', { path: req.path });
    return next(new AppError('Authentication required', 401));
  }

  let merchantId = req.user.merchantId || req.user.merchant?.id || req.user.merchant_profile?.id;
  if (!merchantId) {
    logger.debug('Fetching merchant directly for user', { userId: req.user.id });
    const merchant = await models.Merchant.findOne({
      where: { user_id: req.user.id }
    });

    if (!merchant) {
      logger.warn('restrictToMerchantProfile: No merchant profile found for user', { userId: req.user.id });
      return next(new AppError('Merchant profile not found for this user', 403));
    }

    req.user.merchant = merchant;
    merchantId = merchant.id;
  }

  req.user.merchantId = merchantId;
  logger.debug('restrictToMerchantProfile: Merchant profile confirmed', { userId: req.user.id, merchantId });
  next();
};

module.exports = { restrictToMerchantProfile };