'use strict';

const jwt = require('jsonwebtoken');
const { Driver, Payment } = require('@models');
const TokenService = require('@services/common/tokenService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

/**
 * DriverPaymentMiddleware provides authentication, authorization, and validation
 * for driver payment-related endpoints in the MunchMtxi system.
 */
const DriverPaymentMiddleware = {
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
        logger.warn('No token provided in payment request', { path: req.path });
        return next(new AppError('Authentication token required', 401));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      logger.debug('Token decoded', { driverId: decoded.id, role: decoded.role });

      // Check if token is blacklisted
      const isBlacklisted = await TokenService.isTokenBlacklisted(decoded.id);
      if (isBlacklisted) {
        logger.warn('Blacklisted token used', { driverId: decoded.id });
        return next(new AppError('Token is no longer valid', 401));
      }

      // Fetch driver
      const driver = await Driver.findByPk(decoded.id);
      if (!driver) {
        logger.warn('Driver not found for token', { driverId: decoded.id });
        return next(new AppError('Driver not found', 404));
      }

      // Map numeric role to string based on roles table
      const roleMap = {
        1: 'admin',
        2: 'customer',
        3: 'driver',
        4: 'staff',
        19: 'merchant',
      };
      const role = roleMap[decoded.role] || decoded.role;

      // Attach driver to request
      req.driver = {
        id: driver.id,
        name: driver.name,
        role: role,
      };
      next();
    } catch (error) {
      logger.error('Payment authentication error', { error: error.message, path: req.path });
      return next(new AppError('Invalid token. Please log in again', 401));
    }
  },

  /**
   * Restricts access to drivers only.
   */
  restrictToDriver: (req, res, next) => {
    if (!req.driver || req.driver.role !== 'driver') {
      logger.warn('Non-driver attempted payment access', { user: req.driver });
      return next(new AppError('This route is only accessible to drivers', 403));
    }
    next();
  },

  /**
   * Verifies the driver owns the payment being modified.
   * @param {string} paramId - The name of the payment ID parameter in req.params (default: 'paymentId').
   */
  restrictToPaymentOwner: async (req, res, next, paramId = 'paymentId') => {
    try {
      const paymentId = req.params[paramId];
      if (!paymentId || isNaN(paymentId)) {
        logger.warn('Invalid payment ID provided', { paymentId });
        return next(new AppError('Valid payment ID required', 400));
      }

      const payment = await Payment.findByPk(paymentId);
      if (!payment) {
        logger.warn('Payment not found', { paymentId });
        return next(new AppError('Payment not found', 404));
      }

      if (payment.driver_id !== req.driver.id) {
        logger.warn('Driver not assigned to payment', { driverId: req.driver.id, paymentId });
        return next(new AppError('You are not assigned to this payment', 403));
      }

      req.payment = payment; // Attach payment for downstream use
      next();
    } catch (error) {
      logger.error('Payment ownership check failed', { error: error.message, paymentId });
      return next(new AppError('Payment ownership verification failed', 500));
    }
  },

  /**
   * Validates tip request body.
   */
  validateTipRequest: (req, res, next) => {
    const { amount, percentage } = req.body;

    if (!amount && !percentage) {
      logger.warn('Tip request missing amount or percentage', { body: req.body });
      return next(new AppError('Tip amount or percentage is required', 400));
    }

    if (amount && (typeof amount !== 'number' || amount < 0)) {
      logger.warn('Invalid tip amount', { amount });
      return next(new AppError('Tip amount must be a positive number', 400));
    }

    if (percentage && (typeof percentage !== 'number' || percentage < 0 || percentage > 100)) {
      logger.warn('Invalid tip percentage', { percentage });
      return next(new AppError('Tip percentage must be between 0 and 100', 400));
    }

    next();
  },

  /**
   * Validates payout request body.
   */
  validatePayoutRequest: (req, res, next) => {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      logger.warn('Invalid payout amount', { amount });
      return next(new AppError('Payout amount must be a positive number', 400));
    }

    next();
  },

  /**
   * Rate limits payment-related API requests (e.g., 50 requests/hour).
   */
  rateLimitPayment: async (req, res, next) => {
    try {
      const key = `rate-limit:driver-payment:${req.driver.id}`;
      const limit = 50; // 50 requests per hour
      const windowMs = 60 * 60 * 1000; // 1 hour
      const redisKey = `${key}:${Math.floor(Date.now() / windowMs)}`;

      const currentCount = await TokenService.incrementRateLimit(redisKey);
      if (currentCount === 1) {
        await TokenService.setExpiration(redisKey, windowMs / 1000); // Set TTL
      }

      if (currentCount > limit) {
        logger.warn('Payment rate limit exceeded', { driverId: req.driver.id, count: currentCount });
        return next(new AppError('Rate limit exceeded. Try again later.', 429));
      }

      next();
    } catch (error) {
      logger.error('Payment rate limit check failed', { error: error.message });
      return next(new AppError('Rate limit verification failed', 500));
    }
  },
};

module.exports = DriverPaymentMiddleware;