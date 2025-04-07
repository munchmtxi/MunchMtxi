'use strict';

const jwt = require('jsonwebtoken');
const { User, Staff } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const config = require('@config/config');

const staffCustomerMiddleware = {
  authenticateStaff: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1] || req.cookies?.jwt;
      if (!token) throw new AppError('Authentication token required', 401, 'NO_TOKEN');

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Staff, as: 'staff_profile' }],
      });

      if (!user || !user.staff_profile) {
        throw new AppError('Staff account not found', 401, 'NOT_STAFF');
      }

      req.user = {
        id: user.id,
        staffId: user.staff_profile.id,
        role: 'staff',
        merchantId: user.staff_profile.merchant_id,
        branchId: user.staff_profile.branch_id,
      };
      logger.info('Staff authenticated', { staffId: req.user.staffId });
      next();
    } catch (error) {
      logger.error('Staff authentication failed', { error: error.message });
      next(error instanceof AppError ? error : new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    }
  },

  validateCheckIn: (req, res, next) => {
    const { bookingId } = req.params;
    if (!bookingId || isNaN(parseInt(bookingId, 10))) {
      return next(new AppError('Valid booking ID is required', 400, 'INVALID_BOOKING_ID'));
    }
    next();
  },

  validateBillRequest: (req, res, next) => {
    const { orderId } = req.params;
    if (!orderId || isNaN(parseInt(orderId, 10))) {
      return next(new AppError('Valid order ID is required', 400, 'INVALID_ORDER_ID'));
    }
    next();
  },
};

module.exports = staffCustomerMiddleware;