'use strict';

const jwt = require('jsonwebtoken');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { User } = require('@models');

const validateStaffToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    logger.warn('No token provided in staff operation request');
    return next(new AppError('No token provided', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('Staff token decoded', { decoded });

    const user = await User.findByPk(decoded.id);
    if (!user) {
      logger.warn('User not found for staff token', { userId: decoded.id });
      return next(new AppError('User not found', 401));
    }

    req.user = {
      id: decoded.id,
      roleId: decoded.role,
      merchantId: decoded.merchant_id,
    };
    logger.info('Staff token validated', { userId: req.user.id, merchantId: req.user.merchantId });
    next();
  } catch (error) {
    logger.error('Staff token validation failed', { error: error.message });
    return next(new AppError('Invalid token', 401));
  }
};

const restrictToMerchant = (req, res, next) => {
  const roleId = req.user.roleId;
  const roleMap = { 19: 'merchant' };
  const userRole = roleMap[roleId];

  logger.info('Checking staff operation role', { roleId, mappedRole: userRole });
  if (!userRole || userRole !== 'merchant') {
    logger.warn('Unauthorized role for staff operation', { roleId });
    return next(new AppError('This route is only accessible to merchants', 403));
  }

  req.user.role = userRole;
  next();
};

const checkMerchantStaffPermission = (req, res, next) => {
  const requestedMerchantId = req.params.merchantId;
  logger.info('Merchant permission check', {
    userMerchantId: req.user.merchantId,
    requestedMerchantId: requestedMerchantId,
    params: req.params,
    url: req.url,
    path: req.path,
  });
  if (typeof requestedMerchantId === 'undefined') {
    logger.error('Merchant ID missing from params', { params: req.params });
    return next(new AppError('Merchant ID not provided in URL', 400));
  }
  if (req.user.merchantId !== Number(requestedMerchantId)) {
    logger.warn('Merchant ID mismatch in staff operation', {
      userMerchantId: req.user.merchantId,
      requestedMerchantId: requestedMerchantId,
    });
    return next(new AppError('You do not have permission to manage staff for this merchant', 403));
  }
  logger.info('Merchant permission granted', { merchantId: req.user.merchantId });
  next();
};

const validateStaffOperation = (req, res, next) => {
  const { staffId, taskType, taskId } = req.params;
  const { availabilityStatus, geoData } = req.body;

  if (req.method === 'POST' && req.path.includes('recruit')) {
    const { first_name, email, phone, position, branch_id } = req.body;
    if (!first_name || !email || !phone || !position || !branch_id) {
      return next(new AppError('Missing required fields for staff recruitment', 400));
    }
  }

  if (staffId && !Number.isInteger(Number(staffId))) {
    return next(new AppError('Invalid staff ID', 400));
  }

  if (taskType && !['booking', 'inDiningOrder', 'takeawayOrder', 'subscriptionPickup'].includes(taskType)) {
    return next(new AppError('Invalid task type', 400));
  }

  if (taskId && !Number.isInteger(Number(taskId))) {
    return next(new AppError('Invalid task ID', 400));
  }

  if (availabilityStatus && !['online', 'offline', 'busy'].includes(availabilityStatus)) {
    return next(new AppError('Invalid availability status', 400));
  }

  if (geoData && (!geoData.latitude || !geoData.longitude)) {
    return next(new AppError('Geo data must include latitude and longitude', 400));
  }

  next();
};

const merchantStaffOperationsMiddleware = [
  validateStaffToken,
  restrictToMerchant,
  checkMerchantStaffPermission,
  validateStaffOperation,
];

module.exports = {
  merchantStaffOperationsMiddleware,
  validateStaffOperation,
};