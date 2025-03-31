'use strict';

const jwt = require('jsonwebtoken');
const { User, Customer } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const quickLinkMiddleware = {
  /**
   * Authenticate customer using JWT token
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  authenticateCustomer: async (req, res, next) => {
    try {
      // Extract token from Authorization header
      let token;
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.cookies?.jwt) {
        token = req.cookies.jwt;
      }

      if (!token) {
        return next(new AppError('No token provided. Please log in.', 401, 'NO_TOKEN'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      logger.info('Token decoded', { userId: decoded.id });

      // Fetch user and ensure they have a customer profile
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Customer, as: 'customer_profile' }],
      });

      if (!user) {
        return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
      }

      if (!user.customer_profile) {
        return next(new AppError('This action is only available to customers', 403, 'NOT_A_CUSTOMER'));
      }

      // Check if user is active
      if (user.status !== 'active') {
        return next(new AppError('User account is inactive or suspended', 403, 'ACCOUNT_INACTIVE'));
      }

      // Attach user to request
      req.user = {
        id: user.id,
        customerId: user.customer_profile.id,
        roleId: user.role_id,
      };

      next();
    } catch (error) {
      logger.error('Authentication failed', { error: error.message });
      if (error.name === 'JsonWebTokenError') {
        return next(new AppError('Invalid token. Please log in again.', 401, 'INVALID_TOKEN'));
      }
      if (error.name === 'TokenExpiredError') {
        return next(new AppError('Token has expired. Please log in again.', 401, 'TOKEN_EXPIRED'));
      }
      next(new AppError('Authentication error', 500, 'AUTH_ERROR'));
    }
  },

  /**
   * Restrict access to customers only (role_id = 2)
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next middleware function
   */
  restrictToCustomers: (req, res, next) => {
    if (req.user.roleId !== 2) { // Assuming role_id 2 is 'customer' based on your roles table
      logger.warn('Non-customer attempted access', { userId: req.user.id, roleId: req.user.roleId });
      return next(new AppError('This action is only available to customers', 403, 'NOT_A_CUSTOMER'));
    }
    next();
  },

  /**
   * Validate request body for required fields
   * @param {string[]} requiredFields - Array of required field names
   * @returns {Function} - Middleware function
   */
  validateBody: (requiredFields) => {
    return (req, res, next) => {
      const missingFields = requiredFields.filter(field => !req.body[field]);
      if (missingFields.length > 0) {
        return next(new AppError(
          `Missing required fields: ${missingFields.join(', ')}`,
          400,
          'MISSING_FIELDS'
        ));
      }
      next();
    };
  },
};

module.exports = quickLinkMiddleware;