'use strict';

const jwt = require('jsonwebtoken');
const { User, Staff } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const staffMiddleware = {
  /**
   * Authenticate staff using JWT
   */
  authenticateStaff: async (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1] || req.cookies?.jwt;
      if (!token) {
        return next(new AppError('Authentication token required', 401));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Staff, as: 'staff_profile' }],
      });

      if (!user || !user.staff_profile) {
        return next(new AppError('Staff account not found', 401));
      }

      req.user = {
        id: user.id,
        staffId: user.staff_profile.id,
        role: 'staff',
        merchantId: user.staff_profile.merchant_id,
        branchId: user.staff_profile.branch_id,
      };
      next();
    } catch (error) {
      logger.error('Staff authentication failed', { error: error.message });
      return next(new AppError('Invalid token', 401));
    }
  },

  /**
   * Restrict to specific staff positions (e.g., 'manager', 'waiter')
   */
  restrictToPositions: (...positions) => {
    return async (req, res, next) => {
      try {
        const staff = await Staff.findByPk(req.user.staffId);
        if (!positions.includes(staff.position)) {
          logger.warn('Staff position restriction failed', { position: staff.position, required: positions });
          return next(new AppError('Insufficient staff permissions', 403));
        }
        req.staffPosition = staff.position;
        next();
      } catch (error) {
        logger.error('Position restriction error', { error: error.message });
        return next(new AppError('Permission check failed', 500));
      }
    };
  },

  /**
   * Ensure staff owns or is assigned to the resource (e.g., booking, order)
   */
  isAssignedToResource: (resourceType) => {
    return async (req, res, next) => {
      try {
        const resourceId = req.params[`${resourceType}Id`];
        const Model = resourceType === 'booking' ? require('@models').Booking : require('@models').Order;
        
        const resource = await Model.findByPk(resourceId);
        if (!resource) {
          return next(new AppError(`${resourceType} not found`, 404));
        }
        
        if (resource.staff_id !== req.user.staffId) {
          return next(new AppError('Not assigned to this resource', 403));
        }
        
        req.resource = resource;
        next();
      } catch (error) {
        logger.error('Resource assignment check failed', { error: error.message });
        return next(new AppError('Resource verification failed', 500));
      }
    };
  },
};

module.exports = staffMiddleware;