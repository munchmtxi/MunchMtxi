'use strict';

const jwt = require('jsonwebtoken');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { Staff, MerchantBranch, User } = require('@models');

const validateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('No token provided', 401, 'NO_TOKEN'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('Token decoded in merchant middleware', { decoded });

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return next(new AppError('User not found', 401, 'USER_NOT_FOUND'));
    }

    req.token = token; // Attach raw token
    req.merchant = {
      id: decoded.merchant_id,
      userId: decoded.id,
      roleId: decoded.role,
    };
    next();
  } catch (error) {
    logger.error('Token validation failed in merchant middleware', { error: error.message });
    return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
  }
};

const validateMerchantOwnership = async (req, res, next) => {
  logger.debug('validateMerchantOwnership', { params: req.params, merchant: req.merchant });
  const routeMerchantId = parseInt(req.params.merchantId, 10);
  if (isNaN(routeMerchantId) || !req.params.merchantId) {
    logger.error('Invalid or missing merchantId in route', { params: req.params });
    return next(new AppError('Invalid merchant ID in route', 400, 'INVALID_MERCHANT_ID'));
  }

  if (!req.merchant || req.merchant.id !== routeMerchantId) {
    logger.warn('Merchant ID mismatch', {
      tokenMerchantId: req.merchant?.id,
      routeMerchantId,
    });
    return next(new AppError('You do not have access to this merchant', 403, 'MERCHANT_MISMATCH'));
  }
  next();
};

const validateStaffAssignment = async (req, res, next) => {
  const { staffId } = req.body;
  if (!staffId) return next();

  try {
    const staff = await Staff.findByPk(staffId);
    if (!staff || staff.merchant_id !== req.merchant.id) {
      return next(new AppError('Staff not found or not under this merchant', 404, 'STAFF_NOT_FOUND'));
    }
    if (staff.availability_status !== 'available') {
      return next(new AppError('Staff is not available', 400, 'STAFF_UNAVAILABLE'));
    }
    next();
  } catch (error) {
    logger.error('Staff validation failed', { error: error.message, staffId });
    next(new AppError('Staff validation failed', 500, 'VALIDATION_ERROR'));
  }
};

const validateBranch = async (req, res, next) => {
  const { branchId } = req.params;
  if (!branchId) return next();

  try {
    const branch = await MerchantBranch.findByPk(branchId);
    if (!branch || branch.merchant_id !== req.merchant.id) {
      return next(new AppError('Branch not found or not under this merchant', 404, 'BRANCH_NOT_FOUND'));
    }
    next();
  } catch (error) {
    logger.error('Branch validation failed', { error: error.message, branchId });
    next(new AppError('Branch validation failed', 500, 'VALIDATION_ERROR'));
  }
};

const hasMerchantPermission = (permission) => {
  return async (req, res, next) => {
    try {
      // Updated permissions array
      const merchantPermissions = ['view_bookings', 'assign_staff', 'manage_orders', 'view_reports'];
      if (!merchantPermissions.includes(permission)) {
        return next(new AppError(`Permission '${permission}' not granted for this merchant`, 403, 'PERMISSION_DENIED'));
      }
      next();
    } catch (error) {
      logger.error('Merchant permission check failed', { error: error.message, permission });
      next(new AppError('Permission check failed', 500, 'PERMISSION_ERROR'));
    }
  };
};

module.exports = {
  validateToken,
  validateMerchantOwnership,
  validateStaffAssignment,
  validateBranch,
  hasMerchantPermission,
};