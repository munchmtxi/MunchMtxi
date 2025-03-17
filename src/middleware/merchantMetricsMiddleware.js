'use strict';

const jwt = require('jsonwebtoken');
const { User, Merchant, Order } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const TokenService = require('@services/common/tokenService');
const PerformanceMetricsService = require('@services/merchant/profile/performanceMetricsService');

class MerchantMetricsMiddleware {
  async authenticateMerchant(req, res, next) {
    try {
      const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null;

      if (!token) {
        return next(new AppError('No token provided', 401, 'NO_TOKEN'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.info('Token decoded', { userId: decoded.id });

      const isBlacklisted = await TokenService.isTokenBlacklisted(decoded.id);
      if (isBlacklisted) {
        return next(new AppError('Token is no longer valid', 401, 'TOKEN_BLACKLISTED'));
      }

      const user = await User.findByPk(decoded.id, {
        include: [{ model: Merchant, as: 'merchant_profile' }],
      });

      if (!user) {
        return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
      }

      if (user.role_id !== 19) {
        return next(new AppError('This resource is only accessible to merchants', 403, 'NOT_MERCHANT'));
      }

      if (!user.merchant_profile) {
        return next(new AppError('Merchant profile not found', 404, 'MERCHANT_PROFILE_NOT_FOUND'));
      }

      if (user.status !== 'active') {
        return next(new AppError('User account is inactive', 403, 'USER_INACTIVE'));
      }

      req.user = {
        id: user.id,
        merchantId: user.merchant_profile.id,
        roleId: user.role_id,
        role: 'merchant',
      };

      logger.info('Merchant authenticated', {
        userId: user.id,
        merchantId: user.merchant_profile.id,
      });

      next();
    } catch (error) {
      logger.error('Merchant authentication failed', {
        error: error.message,
        token: req.headers.authorization ? '[provided]' : '[missing]',
      });
      if (error.name === 'JsonWebTokenError') {
        return next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
      }
      next(error);
    }
  }

  validateMetricsParams(req, res, next) {
    const { periodType, startDate, endDate } = req.query;

    if (periodType) {
      const validPeriodTypes = PerformanceMetricsService.periodTypes;
      if (!validPeriodTypes.includes(periodType)) {
        return next(new AppError(
          'Invalid period type',
          400,
          'INVALID_PERIOD_TYPE',
          { allowedTypes: validPeriodTypes }
        ));
      }
    }

    if (startDate) {
      const parsedStart = new Date(startDate);
      if (isNaN(parsedStart.getTime())) {
        return next(new AppError('Invalid start date format', 400, 'INVALID_DATE'));
      }
      req.parsedStartDate = parsedStart;
    }

    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        return next(new AppError('Invalid end date format', 400, 'INVALID_DATE'));
      }
      req.parsedEndDate = parsedEnd;
    }

    // Changed from >= to > to allow same-day ranges
    if (req.parsedStartDate && req.parsedEndDate && req.parsedStartDate > req.parsedEndDate) {
      return next(new AppError('Start date must be before end date', 400, 'INVALID_DATE_RANGE'));
    }

    logger.info('Metrics parameters validated', {
      periodType,
      startDate: req.parsedStartDate?.toISOString(),
      endDate: req.parsedEndDate?.toISOString(),
    });

    next();
  }

  async validateOrderUpdate(req, res, next) {
    const { orderId } = req.body;

    if (!orderId || isNaN(orderId)) {
      return next(new AppError('Valid orderId is required', 400, 'INVALID_ORDER_ID'));
    }

    const order = await Order.findByPk(orderId, {
      attributes: ['id', 'merchant_id'],
    });
    if (!order) {
      return next(new AppError('Order not found', 404, 'ORDER_NOT_FOUND'));
    }

    if (order.merchant_id !== req.user.merchantId) {
      return next(new AppError('You do not have permission to update this order’s metrics', 403, 'ORDER_NOT_OWNED'));
    }

    logger.info('Order update parameters validated', {
      orderId,
      merchantId: req.user.merchantId,
    });

    next();
  }
}

module.exports = new MerchantMetricsMiddleware();