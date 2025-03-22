'use strict';

const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const jwt = require('jsonwebtoken');
const { MerchantBranch, Booking } = require('@models');
const roleService = require('@services/common/roleService');

/**
 * Middleware for reservation-related routes.
 */
const reservationMiddleware = {
  authenticate: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new AppError('No token provided', 401));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.info('Token decoded', { userId: decoded.id, role: decoded.role || decoded.role_id });

      req.user = {
        id: decoded.id,
        roleId: decoded.role_id || decoded.role, // Fixed syntax: use || for fallback
        merchantId: decoded.merchant_id || null,
      };
      logger.info('User set', { user: req.user }); // Added for debugging

      if (!req.user.roleId) {
        return next(new AppError('Role not specified in token', 401));
      }

      next();
    } catch (error) {
      logger.error('Authentication failed', { error: error.message, stack: error.stack });
      return next(new AppError('Invalid or expired token', 401));
    }
  },

  restrictToRoles: (...allowedRoles) => {
    return async (req, res, next) => {
      if (!req.user || !req.user.roleId) {
        return next(new AppError('Authentication required', 401));
      }

      logger.info('Checking role access', { userRoleId: req.user.roleId, allowedRoles });

      if (!allowedRoles.includes(req.user.roleId)) {
        return next(new AppError('You do not have permission to access this resource', 403));
      }

      next();
    };
  },

  verifyBranchAccess: async (req, res, next) => {
    try {
      const { branchId } = req.params;

      const branch = await MerchantBranch.findByPk(branchId);
      if (!branch) {
        return next(new AppError('Branch not found', 404));
      }

      if (req.user.roleId === 19 && req.user.merchantId !== branch.merchant_id) {
        return next(new AppError('You do not have access to this branch', 403));
      }

      req.branch = branch;
      next();
    } catch (error) {
      logger.error('Branch verification failed', { error: error.message, branchId: req.params.branchId });
      return next(new AppError('Failed to verify branch access', 500));
    }
  },

  verifyBookingAccess: async (req, res, next) => {
    try {
      const { bookingId } = req.params;

      const booking = await Booking.findByPk(bookingId);
      if (!booking) {
        return next(new AppError('Booking not found', 404));
      }

      if (req.user.roleId === 19) {
        if (booking.merchant_id !== req.user.merchantId) {
          return next(new AppError('You do not have access to this booking', 403));
        }
      } else if (req.user.roleId === 1) {
        // Admin full access
      } else {
        if (booking.customer_id !== req.user.id) {
          return next(new AppError('You do not have access to this booking', 403));
        }
      }

      req.booking = booking;
      next();
    } catch (error) {
      logger.error('Booking verification failed', { error: error.message, bookingId: req.params.bookingId });
      return next(new AppError('Failed to verify booking access', 500));
    }
  },

  checkReservationEnabled: async (req, res, next) => {
    try {
      if (!req.branch) {
        return next(new AppError('Branch must be verified first', 500));
      }

      if (!req.branch.reservation_settings?.enabled) {
        return next(new AppError('Reservations are not enabled for this branch', 400));
      }

      next();
    } catch (error) {
      logger.error('Reservation enabled check failed', { error: error.message, branchId: req.branch?.id });
      return next(new AppError('Failed to check reservation settings', 500));
    }
  },
};

module.exports = reservationMiddleware;