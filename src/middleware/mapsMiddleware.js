// src/middleware/mapsMiddleware.js
const jwt = require('jsonwebtoken');
const { User, Merchant } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const roleService = require('@services/common/roleService');
const config = require('@config/config');

/**
 * Middleware to verify JWT, ensure merchant role, and attach merchant context.
 */
const authenticateMerchant = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.startsWith('Bearer') 
      ? req.headers.authorization.split(' ')[1] 
      : null;

    if (!token) {
      logger.warn('No token provided in request', { path: req.path });
      return next(new AppError('Authentication token required', 401, 'NO_TOKEN'));
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    logger.debug('Token decoded', { userId: decoded.id });

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Merchant, as: 'merchant_profile' }],
    });

    if (!user) {
      logger.warn('User not found for token', { userId: decoded.id });
      return next(new AppError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const role = await roleService.getRoleById(user.role_id);
    if (role.name !== 'merchant') {
      logger.warn('Non-merchant role attempted map access', { userId: user.id, role: role.name });
      return next(new AppError('This endpoint is restricted to merchants', 403, 'ROLE_RESTRICTED'));
    }

    req.user = {
      id: user.id,
      merchantId: user.merchant_profile?.id,
      role: role.name,
      roleId: user.role_id,
    };

    if (!req.user.merchantId) {
      logger.warn('Merchant profile missing for user', { userId: user.id });
      return next(new AppError('Merchant profile not found', 404, 'MERCHANT_PROFILE_MISSING'));
    }

    logger.info('Merchant authenticated', { userId: user.id, merchantId: req.user.merchantId });
    next();
  } catch (error) {
    logger.error('Authentication error in maps middleware', {
      message: error.message,
      stack: error.stack,
    });
    return next(
      error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'
        ? new AppError('Invalid or expired token', 401, 'TOKEN_INVALID')
        : new AppError('Authentication failed', 500, 'AUTH_FAILURE')
    );
  }
};

/**
 * Middleware to check if merchant has permission to manage addresses.
 */
const hasAddressPermission = async (req, res, next) => {
  try {
    const permissions = await roleService.getRolePermissions(req.user.roleId);
    const canManageAddress = permissions.some(
      (perm) => perm.action === 'manage' && perm.resource === 'address'
    );

    if (!canManageAddress) {
      logger.warn('Merchant lacks address management permission', {
        merchantId: req.user.merchantId,
        roleId: req.user.roleId,
      });
      return next(new AppError('You lack permission to manage addresses', 403, 'PERMISSION_DENIED'));
    }

    logger.debug('Address management permission verified', { merchantId: req.user.merchantId });
    next();
  } catch (error) {
    logger.error('Permission check error in maps middleware', {
      message: error.message,
      stack: error.stack,
    });
    return next(new AppError('Permission check failed', 500, 'PERMISSION_CHECK_FAILURE'));
  }
};

/**
 * Middleware to validate map-related request inputs.
 */
const validateMapInputs = (req, res, next) => {
  const method = req.method.toUpperCase();
  const path = req.path;

  try {
    if (method === 'GET' && path.includes('/predictions')) {
      const { input, sessionToken } = req.query;
      if (!input || typeof input !== 'string' || input.trim() === '') {
        throw new AppError('Invalid or missing input parameter', 400, 'INVALID_INPUT');
      }
      if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.trim() === '') {
        throw new AppError('Invalid or missing sessionToken parameter', 400, 'INVALID_SESSION_TOKEN');
      }
    } else if (method === 'GET' && path.includes('/details')) {
      const { placeId, sessionToken } = req.query;
      if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
        throw new AppError('Invalid or missing placeId parameter', 400, 'INVALID_PLACE_ID');
      }
      if (!sessionToken || typeof sessionToken !== 'string' || sessionToken.trim() === '') {
        throw new AppError('Invalid or missing sessionToken parameter', 400, 'INVALID_SESSION_TOKEN');
      }
    } else if (method === 'PATCH' && path.includes('/update-address')) {
      const { placeId, formattedAddress, location } = req.body;
      if (!placeId || typeof placeId !== 'string' || placeId.trim() === '') {
        throw new AppError('Invalid or missing placeId in body', 400, 'INVALID_PLACE_ID');
      }
      if (!formattedAddress || typeof formattedAddress !== 'string' || formattedAddress.trim() === '') {
        throw new AppError('Invalid or missing formattedAddress in body', 400, 'INVALID_FORMATTED_ADDRESS');
      }
      if (!location || typeof location !== 'object' || !location.lat || !location.lng) {
        throw new AppError('Invalid or missing location (lat, lng) in body', 400, 'INVALID_LOCATION');
      }
      if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        throw new AppError('location.lat and location.lng must be numbers', 400, 'INVALID_LOCATION_TYPE');
      }
    }

    logger.debug('Map inputs validated successfully', { method, path });
    next();
  } catch (error) {
    logger.warn('Input validation failed in maps middleware', {
      method,
      path,
      error: error.message,
    });
    return next(error instanceof AppError ? error : new AppError('Invalid request data', 400, 'VALIDATION_ERROR'));
  }
};

module.exports = {
  authenticateMerchant,
  hasAddressPermission,
  validateMapInputs,
};