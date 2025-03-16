// src/middleware/draftMiddleware.js
'use strict';

const jwt = require('jsonwebtoken');
const { User, Merchant } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const config = require('@config/config');

const protectDraft = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const token = req.headers.authorization?.startsWith('Bearer') 
      ? req.headers.authorization.split(' ')[1] 
      : null;
    if (!token) {
      throw new AppError('No token provided', 401, 'NO_TOKEN');
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    logger.info('Token decoded', { userId: decoded.id });

    // Fetch user with merchant profile
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Merchant, as: 'merchant_profile' }],
    });
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Check if user is a merchant (role_id: 19 per your authMiddleware.js)
    if (user.role_id !== 19) {
      throw new AppError('Only merchants can access drafts', 403, 'NOT_MERCHANT');
    }

    // Ensure merchant profile exists
    if (!user.merchant_profile) {
      throw new AppError('Merchant profile not found', 404, 'MERCHANT_PROFILE_NOT_FOUND');
    }

    // Attach user info to request
    req.user = {
      id: user.id,
      merchantId: user.merchant_profile.id,
      roleId: user.role_id,
    };

    logger.info('Draft access authenticated', {
      userId: req.user.id,
      merchantId: req.user.merchantId
    });

    next();
  } catch (error) {
    logger.error('Draft middleware error', {
      message: error.message,
      stack: error.stack
    });
    next(error instanceof AppError ? error : new AppError('Invalid token', 401, 'INVALID_TOKEN'));
  }
};

const restrictToDraftOwner = (req, res, next) => {
  try {
    // Merchant ID from route params or body (if provided), otherwise use req.user.merchantId
    const draftMerchantId = parseInt(req.params.merchantId || req.body.merchantId || req.user.merchantId, 10);
    if (isNaN(draftMerchantId)) {
      throw new AppError('Merchant ID not provided or invalid', 400, 'INVALID_MERCHANT_ID');
    }

    if (draftMerchantId !== req.user.merchantId) {
      logger.warn('Draft ownership check failed', {
        requestedMerchantId: draftMerchantId,
        userMerchantId: req.user.merchantId
      });
      throw new AppError('You can only access your own drafts', 403, 'NOT_DRAFT_OWNER');
    }

    next();
  } catch (error) {
    logger.error('restrictToDraftOwner error', { message: error.message });
    next(error);
  }
};

module.exports = { protectDraft, restrictToDraftOwner };