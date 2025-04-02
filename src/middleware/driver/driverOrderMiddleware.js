'use strict';

const passport = require('passport');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const TokenService = require('@services/tokenService');
const { Driver, Order } = require('@models');

const DriverOrderMiddleware = {
  /**
   * Authenticate driver using JWT (via passport.js)
   */
  authenticateDriver: passport.authenticate('jwt', { session: false }),

  /**
   * Restrict access to drivers only
   */
  restrictToDriver: async (req, res, next) => {
    try {
      if (!req.user) {
        logger.warn('No user authenticated in restrictToDriver');
        return next(new AppError('Authentication required', 401));
      }

      const driver = await Driver.findOne({ where: { user_id: req.user.id } });
      if (!driver) {
        logger.warn('User is not a driver', { userId: req.user.id });
        return next(new AppError('You must be a driver to access this resource', 403));
      }

      req.driver = driver; // Attach driver object to request
      logger.info('Driver authenticated', { driverId: driver.id, userId: req.user.id });
      next();
    } catch (error) {
      logger.error('restrictToDriver middleware error:', { error: error.message });
      next(new AppError('Driver verification failed', 500));
    }
  },

  /**
   * Verify the driver owns the order (i.e., order.driver_id matches driver.id)
   */
  verifyOrderOwnership: async (req, res, next) => {
    try {
      const { order_id } = req.params;
      if (!order_id) {
        return next(new AppError('Order ID is required', 400));
      }

      const order = await Order.findByPk(order_id);
      if (!order) {
        return next(new AppError('Order not found', 404));
      }

      if (order.driver_id !== req.driver.id) {
        logger.warn('Driver does not own this order', {
          driverId: req.driver.id,
          orderId: order_id,
        });
        return next(new AppError('You are not assigned to this order', 403));
      }

      req.order = order; // Attach order to request for downstream use
      next();
    } catch (error) {
      logger.error('verifyOrderOwnership middleware error:', { error: error.message });
      next(new AppError('Order ownership verification failed', 500));
    }
  },

  /**
   * Validate token for pickup confirmation
   */
  validatePickupToken: async (req, res, next) => {
    try {
      const token = req.headers['x-driver-token'] || req.headers.authorization?.split(' ')[1];
      if (!token) {
        return next(new AppError('Driver token is required', 401));
      }

      const isValid = await TokenService.verifyToken(token, req.user.id);
      if (!isValid) {
        logger.warn('Invalid driver token', { userId: req.user.id });
        return next(new AppError('Invalid or expired token', 401));
      }

      logger.info('Driver token validated', { userId: req.user.id });
      req.token = token; // Attach token to request
      next();
    } catch (error) {
      logger.error('validatePickupToken middleware error:', { error: error.message });
      next(new AppError('Token validation failed', 500));
    }
  },

  /**
   * Ensure driver is available for order assignment
   */
  ensureDriverAvailability: async (req, res, next) => {
    try {
      const { driver_id } = req.body;
      if (!driver_id) {
        return next(new AppError('Driver ID is required', 400));
      }

      const driver = await Driver.findByPk(driver_id);
      if (!driver) {
        return next(new AppError('Driver not found', 404));
      }

      if (driver.availability_status !== 'AVAILABLE') {
        logger.warn('Driver is not available', { driverId: driver_id });
        return next(new AppError('Driver is not available for assignment', 400));
      }

      req.driver = driver; // Attach driver to request
      next();
    } catch (error) {
      logger.error('ensureDriverAvailability middleware error:', { error: error.message });
      next(new AppError('Driver availability check failed', 500));
    }
  },

  /**
   * Validate current_location data for tracking
   */
  validateTrackingData: (req, res, next) => {
    const { current_location } = req.body;
    if (!current_location || !current_location.lat || !current_location.lng) {
      logger.warn('Invalid tracking data', { body: req.body });
      return next(new AppError('Current location (lat, lng) is required', 400));
    }

    // Basic validation for latitude/longitude
    if (
      typeof current_location.lat !== 'number' ||
      typeof current_location.lng !== 'number' ||
      current_location.lat < -90 ||
      current_location.lat > 90 ||
      current_location.lng < -180 ||
      current_location.lng > 180
    ) {
      return next(new AppError('Invalid latitude or longitude values', 400));
    }

    next();
  },
};

module.exports = DriverOrderMiddleware;