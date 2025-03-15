'use strict';
const { Merchant } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const restrictToMerchantPassword = async (req, res, next) => {
  try {
    const userId = req.user.id; // 43
    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    logger.info('restrictToMerchantPassword check', { 
      user: { id: req.user.id, roleId: req.user.roleId }, 
      merchant: merchant ? merchant.id : null 
    });
    if (!merchant || req.user.roleId !== 19) { // Changed role_id to roleId
      logger.warn('Unauthorized access to merchant password route', { userId });
      throw new AppError('Unauthorized: Merchant profile required', 403);
    }
    logger.info('Merchant password access granted', { userId, merchantId: merchant.id });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { restrictToMerchantPassword };