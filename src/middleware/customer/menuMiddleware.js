'use strict';

const jwt = require('jsonwebtoken');
const { User } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

/**
 * Menu Middleware - Authentication and validation for menu routes
 */
const authenticateCustomer = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('Authentication token required', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('Token verified', { userId: decoded.id });

    const user = await User.findByPk(decoded.id, {
      attributes: ['id', 'role_id', 'email'],
    });
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Update this to match your customer role_id
    const customerRoleId = 2; // Changed from 3 to 2
    if (user.role_id !== customerRoleId) {
      return next(new AppError('This endpoint is for customers only', 403));
    }

    req.user = { id: user.id };
    next();
  } catch (error) {
    logger.error('Authentication failed', { error: error.message });
    return next(new AppError('Invalid token', 401));
  }
};

/**
 * Validates query parameters for getMenuItems
 */
const validateMenuQuery = (req, res, next) => {
  const { merchantId, branchId, categoryId } = req.query;

  if (merchantId && isNaN(Number(merchantId))) {
    return next(new AppError('Merchant ID must be a number', 400));
  }
  if (branchId && isNaN(Number(branchId))) {
    return next(new AppError('Branch ID must be a number', 400));
  }
  if (categoryId && isNaN(Number(categoryId))) {
    return next(new AppError('Category ID must be a number', 400));
  }

  next();
};

module.exports = {
  authenticateCustomer,
  validateMenuQuery,
};