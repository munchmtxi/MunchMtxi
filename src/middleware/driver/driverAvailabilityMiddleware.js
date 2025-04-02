'use strict';

const { body, param, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const { Driver } = require('@models');
const TokenService = require('@services/common/tokenService');
const catchAsync = require('@utils/catchAsync');

const driverAvailabilityMiddleware = {
  // Validate driverId
  validateDriverId: [
    param('driverId')
      .isInt().withMessage('Driver ID must be an integer')
      .custom(async (driverId) => {
        const driver = await Driver.findByPk(driverId);
        if (!driver) {
          throw new Error('Driver not found');
        }
        return true;
      }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Validation failed', { errors: errors.array() });
        return next(new AppError(errors.array()[0].msg, 400));
      }
      next();
    }
  ],

  // Validate shift data
  validateShiftData: [
    body('startTime')
      .isISO8601().withMessage('Start time must be a valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) < new Date()) {
          throw new Error('Start time cannot be in the past');
        }
        return true;
      }),
    body('endTime')
      .isISO8601().withMessage('End time must be a valid ISO 8601 date')
      .custom((value, { req }) => {
        if (new Date(value) <= new Date(req.body.startTime)) {
          throw new Error('End time must be after start time');
        }
        return true;
      }),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Shift data validation failed', { errors: errors.array() });
        return next(new AppError(errors.array()[0].msg, 400));
      }
      next();
    }
  ],

  // Validate online status
  validateOnlineStatus: [
    body('isOnline')
      .isBoolean().withMessage('isOnline must be a boolean value'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.error('Online status validation failed', { errors: errors.array() });
        return next(new AppError(errors.array()[0].msg, 400));
      }
      next();
    }
  ],

  protect: catchAsync(async (req, res, next) => {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      logger.warn('No token provided in availability request', { path: req.path });
      return next(new AppError('No token provided', 401));
    }

    logger.debug('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Undefined');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.debug('Token decoded', decoded);

    const isBlacklisted = await TokenService.isTokenBlacklisted(decoded.id);
    if (isBlacklisted) {
      logger.warn('Blacklisted token used', { driverId: decoded.id });
      return next(new AppError('Token is no longer valid', 401));
    }

    const driver = await Driver.findOne({ where: { user_id: decoded.id } });
    if (!driver) {
      logger.warn('Driver not found for token', { driverId: decoded.id });
      return next(new AppError('Driver not found', 404));
    }

    const roleMap = {
      1: 'admin',
      2: 'customer',
      3: 'driver',
      4: 'staff',
      19: 'merchant',
    };
    const role = roleMap[decoded.role] || 'unknown';

    req.driver = {
      id: driver.id, // 4
      name: driver.name,
      role,
      roleId: decoded.role,
      userId: decoded.id, // 49
    };
    logger.info('Driver authenticated', { driverId: req.driver.id, userId: req.driver.userId, role });
    next();
  }),

  restrictTo: catchAsync(async (req, res, next) => {
    if (!req.driver) {
      logger.warn('No driver authenticated', { path: req.path });
      return next(new AppError('Please login first', 401));
    }

    if (req.driver.role !== 'driver') {
      logger.warn('Non-driver attempted availability access', { role: req.driver.role });
      return next(new AppError('This route is only accessible to drivers', 403));
    }

    const driverId = parseInt(req.params.driverId, 10); // Convert string to integer
    if (req.driver.id !== driverId) {
      logger.warn('Driver access denied to other driver data', { driverId: req.driver.id, targetDriverId: driverId });
      return next(new AppError('You can only access your own availability', 403));
    }

    next();
  }),

  restrictToDriverOrAdmin: catchAsync(async (req, res, next) => {
    if (!req.driver) {
      logger.warn('No driver authenticated', { path: req.path });
      return next(new AppError('Please login first', 401));
    }

    const driverId = parseInt(req.params.driverId, 10); // Convert string to integer
    const isDriver = req.driver.role === 'driver';
    const isAdmin = req.driver.role === 'admin';

    if (!isDriver && !isAdmin) {
      logger.warn('Unauthorized role access', { role: req.driver.role, driverId });
      return next(new AppError('Only drivers or admins can access this resource', 403));
    }

    if (isDriver && req.driver.id !== driverId) {
      logger.warn('Driver access denied to other driver data', { driverId: req.driver.id, targetDriverId: driverId });
      return next(new AppError('You can only access your own availability', 403));
    }

    next();
  }),
};

module.exports = driverAvailabilityMiddleware;