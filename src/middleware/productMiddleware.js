// src/middleware/productMiddleware.js
// src/middleware/productMiddleware.js
'use strict';
const jwt = require('jsonwebtoken');
const { User } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError'); // Ensure this is correct
const jwtConfig = require('@config/jwtConfig');

class ProductMiddleware {
  /**
   * Authenticate requests using JWT
   */
  authenticate = async (req, res, next) => {
    try {
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      }
      if (!token) {
        throw new AppError('No token provided', 401);
      }

      const decoded = jwt.verify(token, jwtConfig.secretOrKey);
      logger.info(`🔑 Token decoded`, { userId: decoded.id });

      const user = await User.findByPk(decoded.id, {
        include: [{ model: User.sequelize.models.Merchant, as: 'merchant_profile' }]
      });
      if (!user) {
        throw new AppError('User not found', 401);
      }
      if (user.status !== 'active') {
        throw new AppError('User account is inactive', 403);
      }

      req.user = {
        id: user.id,
        roleId: user.role_id,
        merchantId: user.merchant_profile?.id // Safe access
      };
      logger.info(`✅ User authenticated`, { userId: user.id, roleId: user.role_id });
      next();
    } catch (error) {
      logger.error(`🚨 Auth failed: ${error.message}`);
      next(error instanceof AppError ? error : new AppError('Invalid token', 401));
    }
  };

  /**
   * Restrict to merchant role only (roleId 19)
   */
  restrictToMerchant = (req, res, next) => {
    try {
      if (!req.user || req.user.roleId !== 19) {
        logger.warn(`🚫 Non-merchant attempted access`, { roleId: req.user?.roleId });
        throw new AppError('This endpoint is restricted to merchants only', 403);
      }
      if (!req.user.merchantId) {
        throw new AppError('Merchant profile not found for user', 403);
      }
      req.merchantId = req.user.merchantId;
      logger.info(`🛒 Merchant access granted`, { merchantId: req.user.merchantId });
      next();
    } catch (error) {
      logger.error(`🚨 Merchant check failed: ${error.message}`);
      next(error instanceof AppError ? error : new AppError('Unauthorized access', 403));
    }
  };

  /**
   * Validate product creation/update data
   */
  validateProductData = (req, res, next) => {
    try {
      const data = req.body;
      if (!data.name || typeof data.price !== 'number') {
        throw new AppError('Name and price (number) are required', 400);
      }
      if (data.price < 0) {
        throw new AppError('Price cannot be negative', 400);
      }
      // ... other validations unchanged ...
      next();
    } catch (error) {
      logger.error(`🚨 Product data invalid: ${error.message}`);
      next(error instanceof AppError ? error : new AppError('Invalid product data', 400));
    }
  };

  /**
   * Validate bulk upload request
   */
  validateBulkUpload = (req, res, next) => {
    try {
      if (!req.file) {
        throw new AppError('No file uploaded', 400);
      }
      const format = req.query.format;
      if (!['csv', 'xlsx'].includes(format)) {
        throw new AppError('Format must be csv or xlsx', 400);
      }
      next();
    } catch (error) {
      logger.error('Bulk upload validation failed', { error: error.message });
      next(error);
    }
  };

  /**
   * Validate product ID parameter
   */
  validateProductId = (req, res, next) => {
    try {
      const { productId } = req.params;
      if (!productId || isNaN(parseInt(productId))) {
        throw new AppError('Valid product ID is required', 400);
      }
      next();
    } catch (error) {
      logger.error('Product ID validation failed', { error: error.message });
      next(error);
    }
  };

  /**
   * Validate draft ID parameter
   */
  validateDraftId = (req, res, next) => {
    try {
      const { draftId } = req.params;
      if (!draftId || isNaN(parseInt(draftId))) {
        throw new AppError('Valid draft ID is required', 400);
      }
      next();
    } catch (error) {
      logger.error('Draft ID validation failed', { error: error.message });
      next(error);
    }
  };
}

module.exports = new ProductMiddleware();