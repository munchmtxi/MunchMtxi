'use strict';

const jwt = require('jsonwebtoken');
const { logger } = require('@utils/logger');
const AppError = require('@utils/appError');
const config = require('@config/config');
const { User, Staff } = require('@models');

const staffAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : null;

    if (!token) {
      throw new AppError('No authentication token provided', 401, 'NO_TOKEN');
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    if (!decoded.id) {
      throw new AppError('Invalid token payload', 401, 'INVALID_TOKEN');
    }

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Staff, as: 'staff_profile' }], // Changed from 'staff' to 'staff_profile'
    });

    if (!user || !user.staff_profile) { // Changed from user.staff to user.staff_profile
      throw new AppError('User is not authorized as staff', 403, 'NOT_STAFF');
    }

    req.user = {
      id: user.id,
      staffId: user.staff_profile.id, // Changed from user.staff to user.staff_profile
      role: 'staff',
    };

    logger.info('Staff authenticated', { staffId: req.user.staffId, path: req.path });
    next();
  } catch (error) {
    logger.error('Staff auth middleware failed', { error: error.message, path: req.path });
    next(error instanceof AppError ? error : new AppError('Authentication failed', 401));
  }
};

module.exports = staffAuthMiddleware;