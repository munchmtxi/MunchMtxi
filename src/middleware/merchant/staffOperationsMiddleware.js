'use strict';

const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { validateToken, restrictTo, hasMerchantPermission } = require('@middleware/authMiddleware');

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
  validateToken,
  restrictTo('merchant'),
  hasMerchantPermission('manage_staff'),
  validateStaffOperation,
];

module.exports = {
  merchantStaffOperationsMiddleware,
  validateStaffOperation,
};