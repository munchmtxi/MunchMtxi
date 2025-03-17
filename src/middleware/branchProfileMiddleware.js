// src/middleware/branchProfileMiddleware.js
'use strict';
const jwt = require('jsonwebtoken');
const { User, Merchant, MerchantBranch } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const roleService = require('@services/common/roleService');
const config = require('@config/config');

/**
 * Authenticate the request and ensure the user is a merchant with a valid profile.
 */
const authenticateBranchMerchant = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer') 
      ? req.headers.authorization.split(' ')[1] 
      : null;

    if (!token) {
      logger.warn('No token provided in branch profile request', { path: req.path, method: req.method });
      return next(new AppError('Authentication token required', 401, 'NO_TOKEN'));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    logger.debug('Branch token decoded', { userId: decoded.id });

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Merchant, as: 'merchant_profile' }],
    });

    if (!user) {
      logger.warn('User not found for branch token', { userId: decoded.id });
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const role = await roleService.getRoleById(user.role_id);
    if (role.name !== 'merchant') {
      logger.warn('Non-merchant role attempted branch access', { userId: user.id, role: role.name });
      return next(new AppError('This endpoint is restricted to merchants', 403, 'ROLE_RESTRICTED'));
    }

    if (!user.merchant_profile) {
      logger.warn('Merchant profile missing for branch user', { userId: user.id });
      return next(new AppError('Merchant profile not found', 404, 'MERCHANT_PROFILE_MISSING'));
    }

    req.user = {
      id: user.id,
      merchantId: user.merchant_profile.id,
      role: role.name,
      roleId: user.role_id,
    };

    logger.info('Merchant authenticated for branch access', { userId: user.id, merchantId: req.user.merchantId });
    next();
  } catch (error) {
    logger.error('Branch authentication error', { message: error.message, stack: error.stack });
    return next(
      error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'
        ? new AppError('Invalid or expired token', 401, 'TOKEN_INVALID')
        : new AppError('Authentication failed', 500, 'AUTH_FAILURE')
    );
  }
};

/**
 * Verify that the merchant owns the specified branch.
 */
const verifyBranchOwnership = async (req, res, next) => {
  try {
    const { branchId } = req.params;
    if (!branchId) {
      logger.warn('Branch ID not provided', { path: req.path, method: req.method });
      return next(new AppError('Branch ID required', 400, 'MISSING_BRANCH_ID'));
    }

    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch) {
      logger.warn('Branch not found', { branchId });
      return next(new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND'));
    }

    if (branch.merchant_id !== req.user.merchantId) {
      logger.warn('Merchant does not own branch', { merchantId: req.user.merchantId, branchId });
      return next(new AppError('You do not have permission to access this branch', 403, 'UNAUTHORIZED_BRANCH_ACCESS'));
    }

    req.branch = branch;
    logger.debug('Branch ownership verified', { merchantId: req.user.merchantId, branchId });
    next();
  } catch (error) {
    logger.error('Branch ownership verification error', { message: error.message, stack: error.stack });
    return next(new AppError('Failed to verify branch ownership', 500, 'OWNERSHIP_CHECK_FAILURE'));
  }
};

/**
 * Check if the merchant has permission to perform a specific branch action.
 * @param {string} action - The action to check (e.g., 'create', 'update', 'delete').
 */
const hasBranchPermission = (action) => {
  return async (req, res, next) => {
    try {
      const permissions = await roleService.getRolePermissions(req.user.roleId);
      const canPerformAction = permissions.some(
        (perm) => perm.action === action && perm.resource === 'branch_profile'
      );

      if (!canPerformAction) {
        logger.warn('Merchant lacks branch action permission', {
          merchantId: req.user.merchantId,
          action,
          roleId: req.user.roleId,
        });
        return next(new AppError(`You lack permission to ${action} branch profiles`, 403, 'PERMISSION_DENIED'));
      }

      logger.debug('Branch action permission verified', { merchantId: req.user.merchantId, action });
      next();
    } catch (error) {
      logger.error('Branch permission check error', { message: error.message, stack: error.stack });
      return next(new AppError('Permission check failed', 500, 'PERMISSION_CHECK_FAILURE'));
    }
  };
};

/**
 * Validate inputs for branch profile requests.
 */
const validateBranchInputs = (req, res, next) => {
  const method = req.method.toUpperCase();
  const path = req.path;

  try {
    if (method === 'POST' || method === 'PATCH') {
      const { name, location, operating_hours, delivery_radius, placeId, sessionToken } = req.body;

      if (method === 'POST' && (!name || typeof name !== 'string' || name.trim() === '')) {
        throw new AppError('Branch name is required', 400, 'INVALID_NAME');
      }

      if (placeId && (!sessionToken || typeof sessionToken !== 'string' || sessionToken.trim() === '')) {
        throw new AppError('Session token required with placeId', 400, 'INVALID_SESSION_TOKEN');
      }

      if (location) {
        if (typeof location !== 'object' || !location.latitude || !location.longitude) {
          throw new AppError('Invalid location (latitude, longitude) required', 400, 'INVALID_LOCATION');
        }
        if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
          throw new AppError('Location coordinates must be numbers', 400, 'INVALID_LOCATION_TYPE');
        }
      }

      if (operating_hours) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const timeFormat = /^([01]\d|2[0-3]):([0-5]\d)$/;
        for (const day of days) {
          if (operating_hours[day]) {
            if (!operating_hours[day].open || !operating_hours[day].close) {
              throw new AppError(`Operating hours for ${day} must include open and close times`, 400, 'INVALID_OPERATING_HOURS');
            }
            if (!timeFormat.test(operating_hours[day].open) || !timeFormat.test(operating_hours[day].close)) {
              throw new AppError(`Invalid time format for ${day}`, 400, 'INVALID_OPERATING_HOURS');
            }
          }
        }
      }

      if (delivery_radius !== undefined && (typeof delivery_radius !== 'number' || delivery_radius < 0)) {
        throw new AppError('Delivery radius must be a non-negative number', 400, 'INVALID_DELIVERY_RADIUS');
      }
    } else if (method === 'GET' && path.includes('/predictions')) {
      const { input, sessionToken } = req.query;
      if (!input || typeof input !== 'string' || input.trim() === '') {
        throw new AppError('Input is required for predictions', 400, 'INVALID_INPUT');
      }
      if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.trim() === '') {
        throw new AppError('Session token is required for predictions', 400, 'INVALID_SESSION_TOKEN');
      }
    }

    logger.debug('Branch inputs validated successfully', { method, path });
    next();
  } catch (error) {
    logger.warn('Branch input validation failed', { method, path, error: error.message });
    return next(error instanceof AppError ? error : new AppError('Invalid request data', 400, 'VALIDATION_ERROR'));
  }
};

module.exports = {
  authenticateBranchMerchant,
  verifyBranchOwnership,
  hasBranchPermission,
  validateBranchInputs,
};