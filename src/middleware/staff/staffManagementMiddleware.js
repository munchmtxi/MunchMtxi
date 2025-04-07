'use strict';

const jwt = require('jsonwebtoken');
const config = require('@config/config');
const { logger } = require('@utils/logger');
const AppError = require('@utils/appError');
const { User, Staff } = require('@models');

const staffManagementMiddleware = {
  /**
   * Authenticate staff using JWT from header or cookie
   */
  authenticateStaff: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : req.cookies?.jwt;

      if (!token) {
        logger.warn('No token provided', { path: req.path });
        return next(new AppError('Authentication token required', 401, 'NO_TOKEN'));
      }

      const decoded = jwt.verify(token, config.jwt.secret);
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Staff, as: 'staff_profile' }],
      });

      if (!user || !user.staff_profile) {
        logger.warn('User not a staff member', { userId: decoded.id, path: req.path });
        return next(new AppError('User is not authorized as staff', 403, 'NOT_STAFF'));
      }

      req.user = {
        id: user.id,
        staffId: user.staff_profile.id,
        roleId: user.role_id,
        branchId: user.staff_profile.branch_id,
      };

      logger.info('Staff authenticated', { staffId: req.user.staffId, path: req.path });
      next();
    } catch (error) {
      logger.error('Staff authentication failed', { error: error.message, path: req.path });
      return next(new AppError('Invalid token or authentication failed', 401, 'AUTH_FAILED'));
    }
  },

  /**
   * Ensure staff is active (not offline)
   */
  restrictToActiveStaff: async (req, res, next) => {
    try {
      const staff = await Staff.findByPk(req.user.staffId);
      if (!staff) {
        return next(new AppError('Staff not found', 404, 'STAFF_NOT_FOUND'));
      }
      if (staff.availability_status === 'offline') {
        logger.warn('Staff is offline', { staffId: req.user.staffId, path: req.path });
        return next(new AppError('Staff is currently offline', 403, 'STAFF_OFFLINE'));
      }
      req.staffStatus = staff.availability_status;
      next();
    } catch (error) {
      logger.error('Error checking staff status', { error: error.message, staffId: req.user.staffId });
      return next(new AppError('Failed to verify staff status', 500));
    }
  },

  /**
   * Validate staff assignment to a specific resource (booking, order, etc.)
   */
  isAssignedToResource: (resourceType) => {
    return async (req, res, next) => {
      try {
        const resourceId = req.body[`${resourceType}Id`]; // e.g., bookingId, orderId
        if (!resourceId) {
          return next(new AppError(`${resourceType}Id is required`, 400, 'MISSING_RESOURCE_ID'));
        }

        const Model = {
          booking: require('@models').Booking,
          order: require('@models').InDiningOrder,
          notification: require('@models').Notification,
          subscription: require('@models').Subscription,
          payment: require('@models').Payment,
        }[resourceType];

        if (!Model) {
          return next(new AppError('Invalid resource type', 400, 'INVALID_RESOURCE_TYPE'));
        }

        const resource = await Model.findByPk(resourceId);
        if (!resource) {
          return next(new AppError(`${resourceType} not found`, 404, `${resourceType.toUpperCase()}_NOT_FOUND`));
        }

        // Check staff assignment where applicable
        if (resourceType === 'booking' || resourceType === 'order') {
          if (resource.staff_id && resource.staff_id !== req.user.staffId) {
            logger.warn('Staff not assigned to resource', { staffId: req.user.staffId, resourceId, resourceType });
            return next(new AppError('Not assigned to this resource', 403, 'NOT_ASSIGNED'));
          }
        }

        req.resource = resource;
        next();
      } catch (error) {
        logger.error('Resource assignment check failed', { error: error.message, resourceType, staffId: req.user.staffId });
        return next(new AppError('Resource verification failed', 500));
      }
    };
  },
};

module.exports = staffManagementMiddleware;