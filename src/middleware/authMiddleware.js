'use strict';
const passport = require('passport');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const roleService = require('@services/common/roleService');
const { trackDevice } = require('@services/common/deviceService');
const TokenService = require('@services/common/tokenService');
const jwt = require('jsonwebtoken');
const { User, Merchant } = require('@models');

// Legacy Passport authentication middleware
const legacyAuthenticate = passport.authenticate('jwt', { session: false });

const legacyRestrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('No user authenticated');
      return next(new AppError('Authentication required', 401));
    }
    const roleMap = { 19: 'merchant', 1: 'admin' };
    const userRole = roleMap[req.user.role] || 'unknown';
    logger.info('User role:', { id: req.user.id, role: req.user.role, mapped: userRole });
    if (!roles.includes(userRole)) {
      logger.warn('Role restriction failed', { userRole, required: roles });
      return next(new AppError('You are not authorized to perform this action', 403));
    }
    next();
  };
};

// Standard authentication using Passport's JWT strategy
const authenticate = async (req, res, next) => {
  passport.authenticate('jwt', async (err, user, info) => {
    logger.info('Passport auth attempt', { err, user: !!user, info });
    if (err) return next(err);
    if (!user) return next(new AppError('Authentication failed', 401));

    const isBlacklisted = await TokenService.isTokenBlacklisted(user.id);
    if (isBlacklisted) {
      return next(new AppError('Token is no longer valid', 401));
    }

    req.user = user;
    const deviceInfo = {
      deviceId: req.headers['x-device-id'] || req.body.deviceId,
      deviceType: req.headers['x-device-type'] || req.body.deviceType,
    };

    if (deviceInfo.deviceId && deviceInfo.deviceType) {
      try {
        await trackDevice(user.id, deviceInfo);
      } catch (error) {
        return next(new AppError('Device tracking failed', 500));
      }
    }
    next();
  })(req, res, next);
};

// Authorize roles by roleId check
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const allowedRoles = roles.flat();
    logger.info('authorizeRoles check', { userRoleId: req.user.roleId, allowedRoles });
    if (!allowedRoles.includes(req.user.roleId)) {
      logger.warn('Role authorization failed', { userRoleId: req.user.roleId, required: allowedRoles });
      return next(new AppError('You are not authorized to access this resource', 403));
    }
    next();
  };
};

// Authorize an action on a resource based on role permissions
const authorize = (action, resource) => {
  return async (req, res, next) => {
    try {
      const userPermissions = await roleService.getRolePermissions(req.user.roleId);
      const hasPermission = userPermissions.some(
        perm => perm.action === action && perm.resource === resource
      );
      if (!hasPermission) {
        return next(new AppError('You are not authorized to perform this action.', 403));
      }
      next();
    } catch (error) {
      next(new AppError('Authorization failed.', 500));
    }
  };
};

// Validate token and attach a formatted user object
const validateToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return next(new AppError('No token provided', 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('Token decoded', { decoded });
    const user = await User.findByPk(decoded.id, {
      include: [{ model: Merchant, as: 'merchant_profile' }],
    });
    logger.info('User lookup', { userId: decoded.id, found: !!user });
    if (!user) {
      return next(new AppError('User not found', 401));
    }
    req.user = {
      id: user.id,
      merchantId: user.merchant_profile?.id,
      role: user.role_id === 19 ? 'merchant' : 'other',
      roleId: user.role_id
    };
    logger.info('Token validated', { userId: user.id, merchantId: req.user.merchantId });
    next();
  } catch (error) {
    logger.error('Token validation failed', { error: error.message });
    return next(new AppError('Invalid token', 401));
  }
};

// Simple middleware to require authentication
const requireAuth = async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  next();
};

// Middleware to check merchant-specific permissions
const hasMerchantPermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (req.user.role !== 'merchant') {
        return next(new AppError('This route is only accessible to merchants', 403));
      }
      const merchantPermissions = await roleService.getMerchantPermissions(req.user.merchantId);
      if (!merchantPermissions.includes(permission)) {
        return next(new AppError('You do not have the required merchant permission', 403));
      }
      next();
    } catch (error) {
      logger.error('Merchant permission check failed:', error);
      next(new AppError('Permission check failed', 500));
    }
  };
};

// Middleware to verify staff access based on allowed staff roles
const verifyStaffAccess = (allowedStaffRoles = []) => {
  return async (req, res, next) => {
    try {
      if (req.user.role !== 'staff') {
        return next(new AppError('This route is only accessible to staff members', 403));
      }
      const staffDetails = await roleService.getStaffDetails(req.user.id);
      if (!staffDetails) {
        return next(new AppError('Staff details not found', 404));
      }
      if (allowedStaffRoles.length && !allowedStaffRoles.includes(staffDetails.staffRole)) {
        return next(new AppError('You do not have the required staff role', 403));
      }
      req.staffDetails = staffDetails;
      next();
    } catch (error) {
      logger.error('Staff access verification failed:', error);
      next(new AppError('Staff verification failed', 500));
    }
  };
};

// Middleware to check if the requesting user owns the resource
const isResourceOwner = (paramId, userField = 'userId') => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramId];
      if (!resourceId) {
        return next(new AppError('Resource ID not provided', 400));
      }
      const resource = await roleService.getResource(resourceId);
      if (!resource) {
        return next(new AppError('Resource not found', 404));
      }
      if (resource[userField] !== req.user.id) {
        return next(new AppError('You do not have permission to access this resource', 403));
      }
      req.resource = resource;
      next();
    } catch (error) {
      logger.error('Resource ownership check failed:', error);
      next(new AppError('Ownership verification failed', 500));
    }
  };
};

// API key verification middleware
const verifyApiKey = async (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
      return next(new AppError('API key is required', 401));
    }
    const isValidKey = await TokenService.verifyApiKey(apiKey);
    if (!isValidKey) {
      return next(new AppError('Invalid API key', 401));
    }
    next();
  } catch (error) {
    logger.error('API key verification failed:', error);
    next(new AppError('API key verification failed', 500));
  }
};

// Role-based rate limiting middleware
const checkRoleBasedRateLimit = (role) => {
  return async (req, res, next) => {
    try {
      const rateLimits = { customer: 100, merchant: 200, staff: 150, admin: 300 };
      const limit = rateLimits[role] || 50;
      const key = `rate-limit:${req.user.id}:${role}`;
      const currentRequests = await TokenService.incrementRateLimit(key);
      if (currentRequests > limit) {
        return next(new AppError('Rate limit exceeded for your role', 429));
      }
      next();
    } catch (error) {
      logger.error('Rate limit check failed:', error);
      next(new AppError('Rate limit check failed', 500));
    }
  };
};

/*
  --- Legacy protect & restrictTo implementations (can be used as reference) ---
*/

// Old protect function (will be aliased as oldProtect)
const oldProtect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }
    if (!token) {
      return next(new AppError('No token provided', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('JWT Payload received:', decoded);

    const currentUser = await User.findByPk(decoded.id);
    if (!currentUser) {
      return next(new AppError('User not found', 404));
    }

    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return next(new AppError('User recently changed password. Please log in again', 401));
      }
    }

    const deviceInfo = {
      deviceId: req.headers['x-device-id'] || req.body.deviceId,
      deviceType: req.headers['x-device-type'] || req.body.deviceType,
    };
    if (deviceInfo.deviceId && deviceInfo.deviceType) {
      try {
        await trackDevice(currentUser.id, deviceInfo);
      } catch (error) {
        logger.error('Device tracking failed:', error);
      }
    }

    req.user = currentUser;
    next();
  } catch (error) {
    logger.error('Protect middleware error:', { message: error.message });
    return next(new AppError('Invalid token. Please log in again', 401));
  }
};

// New protect function with role attached from token payload
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }
    if (!token) {
      return next(new AppError('No token provided', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    logger.info('JWT Payload received:', decoded);

    const currentUser = await User.findByPk(decoded.id);
    if (!currentUser) {
      return next(new AppError('User not found', 404));
    }

    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return next(new AppError('User recently changed password. Please log in again', 401));
      }
    }

    const deviceInfo = {
      deviceId: req.headers['x-device-id'] || req.body.deviceId,
      deviceType: req.headers['x-device-type'] || req.body.deviceType,
    };
    if (deviceInfo.deviceId && deviceInfo.deviceType) {
      try {
        await trackDevice(currentUser.id, deviceInfo);
      } catch (error) {
        logger.error('Device tracking failed:', error);
      }
    }

    req.user = currentUser;
    req.user.role = decoded.role; // Attach role from the token payload
    next();
  } catch (error) {
    logger.error('Protect middleware error:', { message: error.message });
    return next(new AppError('Invalid token. Please log in again', 401));
  }
};

// Old restrictTo function (alias as oldRestrictTo)
const oldRestrictTo = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Please login first', 401));
      }
      const userRole = await roleService.getRoleById(req.user.role_id); // Updated to use role_id
      if (!userRole) {
        return next(new AppError('Role not found', 404));
      }
      if (!roles.includes(userRole.name)) {
        return next(new AppError('You do not have permission to perform this action', 403));
      }
      req.userRole = userRole;
      next();
    } catch (error) {
      logger.error('RestrictTo middleware error:', error);
      next(new AppError('Role verification failed', 500));
    }
  };
};

// New restrictTo function with temporary role mapping (assumes role ID 19 is 'merchant')
const restrictTo = (...roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AppError('Please login first', 401));
      }

      // Temporary fix: Assume role ID 19 corresponds to 'merchant'
      const roleId = req.user.role || req.user.roleId;
      logger.info('Checking role:', { roleId, expectedRoles: roles });

      const userRoleName = roleId === 19 ? 'merchant' : null;
      if (!userRoleName) {
        logger.warn('Role ID not mapped', { roleId });
        return next(new AppError('Role not found', 404));
      }

      if (!roles.includes(userRoleName)) {
        logger.warn('Role permission denied', { role: userRoleName, required: roles });
        return next(new AppError('You do not have permission to perform this action', 403));
      }

      req.userRole = { id: roleId, name: userRoleName };
      next();
    } catch (error) {
      logger.error('RestrictTo middleware error:', error);
      next(new AppError('Role verification failed', 500));
    }
  };
};

// Optional alias for staff verification
const verifyStaff = verifyStaffAccess;

module.exports = {
  authenticate,
  authorizeRoles,
  authorize,
  validateToken,
  requireAuth,
  hasMerchantPermission,
  verifyStaffAccess,
  isResourceOwner,
  verifyApiKey,
  checkRoleBasedRateLimit,
  protect,        // New protect middleware with role attachment
  restrictTo,     // New restrictTo middleware with temporary role mapping
  legacyAuthenticate,
  legacyRestrictTo,
  oldProtect,     // Legacy protect (kept for backward compatibility)
  oldRestrictTo,  // Legacy restrictTo (kept for backward compatibility)
  verifyStaff
};
