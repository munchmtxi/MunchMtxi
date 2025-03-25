'use strict';

const jwt = require('jsonwebtoken');
const { Customer, Merchant } = require('@models');
const AppError = require('@utils/AppError');
const { logger, logSecurityEvent } = require('@utils/logger');

/**
 * Middleware to authenticate and authorize users for booking-related actions.
 * @param {string} requiredRole - The required role ('customer', 'merchant', or 'any').
 * @returns {Function} Express middleware function.
 */
const bookingAuthMiddleware = (requiredRole) => {
  return async (req, res, next) => {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'NO_TOKEN', null, { path: req.path });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let user;

      // Fetch user based on role and ID from token
      if (requiredRole === 'customer' || requiredRole === 'any') {
        user = await Customer.findOne({
          where: { user_id: decoded.id },
          attributes: ['id', 'user_id'],
        });
      }
      if ((!user && requiredRole === 'merchant') || requiredRole === 'any') {
        user = await Merchant.findOne({
          where: { user_id: decoded.id },
          attributes: ['id', 'user_id'],
        });
      }

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND', null, { userId: decoded.id });
      }

      // Determine user role
      const role = user instanceof Customer ? 'customer' : 'merchant';

      // Check role authorization
      if (requiredRole !== 'any' && role !== requiredRole) {
        throw new AppError(
          `Unauthorized: Requires ${requiredRole} role`,
          403,
          'ROLE_UNAUTHORIZED',
          null,
          { requiredRole, userRole: role }
        );
      }

      // Attach user info to request
      req.user = {
        id: user.id,       // Customer or Merchant ID
        userId: user.user_id, // Underlying User table ID
        role: role,
      };

      logSecurityEvent('User authenticated for booking action', {
        userId: user.id,
        role,
        path: req.path,
      });

      next();
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid token', 401, 'INVALID_TOKEN', null, { tokenError: error.message });
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expired', 401, 'TOKEN_EXPIRED', null, { expiredAt: error.expiredAt });
      }
      next(error); // Pass AppError or other errors to global handler
    }
  };
};

module.exports = bookingAuthMiddleware;