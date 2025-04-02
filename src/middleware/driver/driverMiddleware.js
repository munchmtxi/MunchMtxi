'use strict';

const passport = require('passport');
const jwt = require('jsonwebtoken');
const { Driver, Ride } = require('@models');
const TokenService = require('@services/common/tokenService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

/**
 * DriverMiddleware provides authentication, authorization, and validation
 * for driver-related endpoints in the MunchMtxi ride-hailing system.
 */
const DriverMiddleware = {
  /**
   * Protects routes by verifying JWT and attaching the driver to req.driver.
   */
  protect: async (req, res, next) => {
    try {
      let token;
      if (req.headers.authorization?.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
      }
      if (!token) {
        logger.warn('No token provided in request', { path: req.path });
        return next(new AppError('Authentication token required', 401));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      logger.debug('Token decoded', { driverId: decoded.sub, jti: decoded.jti });

      // Check if token is blacklisted
      const isBlacklisted = await TokenService.isTokenBlacklisted(decoded.sub);
      if (isBlacklisted) {
        logger.warn('Blacklisted token used', { driverId: decoded.sub });
        return next(new AppError('Token is no longer valid', 401));
      }

      // Fetch driver
      const driver = await Driver.findByPk(decoded.sub);
      if (!driver) {
        logger.warn('Driver not found for token', { driverId: decoded.sub });
        return next(new AppError('Driver not found', 404));
      }

      // Attach driver to request
      req.driver = {
        id: driver.id,
        name: driver.name,
        role: 'driver', // Hardcoded as this is driver-specific middleware
      };
      req.user = req.driver; // For compatibility with controllers expecting req.user
      next();
    } catch (error) {
      logger.error('Authentication error', { error: error.message, path: req.path });
      return next(new AppError('Invalid token. Please log in again', 401));
    }
  },

  /**
   * Restricts access to drivers only.
   */
  restrictToDriver: (req, res, next) => {
    if (!req.driver || req.driver.role !== 'driver') {
      logger.warn('Non-driver attempted access', { user: req.driver || req.user });
      return next(new AppError('This route is only accessible to drivers', 403));
    }
    next();
  },

  /**
   * Ensures the driver owns the ride (i.e., is assigned to it).
   * @param {string} paramId - The name of the ride ID parameter in req.params.
   */
  restrictToRideOwner: async (req, res, next) => {
    try {
      const rideId = req.params[paramId] || req.params.rideId;
      if (!rideId) {
        logger.warn('Ride ID not provided', { path: req.path });
        return next(new AppError('Ride ID required', 400));
      }

      const ride = await Ride.findByPk(rideId);
      if (!ride) {
        logger.warn('Ride not found', { rideId });
        return next(new AppError('Ride not found', 404));
      }

      if (ride.driverId !== req.driver.id) {
        logger.warn('Driver not assigned to ride', { driverId: req.driver.id, rideId });
        return next(new AppError('You are not assigned to this ride', 403));
      }

      req.ride = ride; // Attach ride for downstream use
      next();
    } catch (error) {
      logger.error('Ride ownership check failed', { error: error.message, rideId });
      return next(new AppError('Ride ownership verification failed', 500));
    }
  },

  /**
   * Validates ride acceptance request.
   */
  validateRideAcceptance: (req, res, next) => {
    const { rideId } = req.params;
    if (!rideId || isNaN(rideId)) {
      logger.warn('Invalid rideId for acceptance', { rideId });
      return next(new AppError('Valid ride ID required', 400));
    }
    next();
  },

  /**
   * Validates ride completion request.
   */
  validateRideCompletion: (req, res, next) => {
    const { rideId } = req.params;
    if (!rideId || isNaN(rideId)) {
      logger.warn('Invalid rideId for completion', { rideId });
      return next(new AppError('Valid ride ID required', 400));
    }
    next();
  },

  /**
   * Validates location update request body.
   */
  validateLocationUpdate: (req, res, next) => {
    const { lat, lng } = req.body;
    if (!lat || !lng || typeof lat !== 'number' || typeof lng !== 'number') {
      logger.warn('Invalid location data', { lat, lng });
      return next(new AppError('Latitude and longitude must be valid numbers', 400));
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      logger.warn('Location coordinates out of bounds', { lat, lng });
      return next(new AppError('Coordinates out of valid range', 400));
    }
    next();
  },

  /**
   * Rate limits driver API requests (e.g., 100 requests/hour).
   */
  rateLimitDriver: async (req, res, next) => {
    try {
      const key = `rate-limit:driver:${req.driver.id}`;
      const limit = 100; // Example: 100 requests per hour
      const windowMs = 60 * 60 * 1000; // 1 hour
      const redisKey = `${key}:${Math.floor(Date.now() / windowMs)}`;

      const currentCount = await TokenService.incrementRateLimit(redisKey); // Assumes TokenService has this method
      if (currentCount === 1) {
        await TokenService.setExpiration(redisKey, windowMs / 1000); // Set TTL
      }

      if (currentCount > limit) {
        logger.warn('Driver rate limit exceeded', { driverId: req.driver.id, count: currentCount });
        return next(new AppError('Rate limit exceeded. Try again later.', 429));
      }

      next();
    } catch (error) {
      logger.error('Rate limit check failed', { error: error.message });
      return next(new AppError('Rate limit verification failed', 500));
    }
  },

  /**
   * Ensures the driver is available (not busy).
   */
  ensureDriverAvailable: async (req, res, next) => {
    try {
      const driver = await Driver.findByPk(req.driver.id);
      if (driver.availability_status !== 'AVAILABLE') {
        logger.warn('Driver not available', { driverId: req.driver.id, status: driver.availability_status });
        return next(new AppError('Driver is currently unavailable', 400));
      }
      next();
    } catch (error) {
      logger.error('Availability check failed', { error: error.message });
      return next(new AppError('Availability check failed', 500));
    }
  },
};

/**
 * Helper method for TokenService to increment rate limit (if not already implemented).
 * This is a placeholder; you may need to adjust TokenService accordingly.
 */
TokenService.incrementRateLimit = async (key) => {
  const redis = require('ioredis');
  const client = new redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });
  const count = await client.incr(key);
  client.quit();
  return count;
};

/**
 * Helper method for TokenService to set expiration (if not already implemented).
 */
TokenService.setExpiration = async (key, seconds) => {
  const redis = require('ioredis');
  const client = new redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT });
  await client.expire(key, seconds);
  client.quit();
};

module.exports = DriverMiddleware;