// src/middleware/staff/staffProfileMiddleware.js
'use strict';

const { Staff, User } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const attachStaffProfile = async (req, res, next) => {
  try {
    if (!req.user || !req.user.id) {
      logger.warn('No authenticated user found', { path: req.path });
      return next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    }

    const user = await User.findByPk(req.user.id, {
      include: [{
        model: Staff,
        as: 'staff_profile',
        attributes: [
          'id', 'user_id', 'merchant_id', 'position', 'manager_id',
          'assigned_area', 'work_location', 'geofence_id',
          'created_at', 'updated_at', 'deleted_at'
        ], // Explicitly list only existing columns
      }],
    });

    if (!user) {
      logger.error('User not found during staff profile attachment', { userId: req.user.id });
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    if (!user.staff_profile) {
      logger.warn('User is not a staff member', { userId: req.user.id });
      return next(new AppError('This route is only accessible to staff', 403, 'NOT_STAFF'));
    }

    req.user = user; // Attach the full user object with staff_profile
    logger.info('Staff profile attached to request', { userId: req.user.id, staffId: user.staff_profile.id });
    next();
  } catch (error) {
    logger.error('Error attaching staff profile', { error: error.message, stack: error.stack });
    return next(new AppError('Failed to verify staff profile', 500, 'STAFF_PROFILE_ERROR'));
  }
};

module.exports = { attachStaffProfile };