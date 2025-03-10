const passport = require('passport');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const roleService = require('@services/common/roleService');
const { trackDevice } = require('@services/common/deviceService');
const TokenService = require('@services/common/tokenService'); // Newly added import

// --------------------------------------------------------------------------
// Legacy Middleware (from original snippet)
// --------------------------------------------------------------------------

const legacyAuthenticate = passport.authenticate('jwt', { session: false });

const legacyRestrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      logger.warn('No user authenticated');
      return next(new AppError('Authentication required', 401));
    }
    // Map role_id to role name
    const roleMap = {
      19: 'merchant',
      1: 'admin', // Add other roles as needed
      // Add mappings based on your roles table
    };
    // Assume req.user.role contains the role_id
    const userRole = roleMap[req.user.role] || 'unknown';
    logger.info('User role:', { id: req.user.id, role: req.user.role, mapped: userRole });
    if (!roles.includes(userRole)) {
      logger.warn('Role restriction failed', { userRole, required: roles });
      return next(new AppError('You are not authorized to perform this action', 403));
    }
    next();
  };
};

// --------------------------------------------------------------------------
// Extended Middleware (from your current code)
// --------------------------------------------------------------------------

/**
 * Middleware to authenticate users using JWT.
 */
const authenticate = async (req, res, next) => {
  passport.authenticate('jwt', async (err, user, info) => {
    if (err) return next(err);
    if (!user) return next(new AppError('Authentication failed', 401));

    // Check if token is blacklisted
    const isBlacklisted = await TokenService.isTokenBlacklisted(user.id);
    if (isBlacklisted) {
      return next(new AppError('Token is no longer valid', 401));
    }

    req.user = user;

    // Extract device info from request headers or body
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

/**
 * Middleware to authorize users based on their roles.
 * @param  {...any} roles - Allowed roles.
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const allowedRoles = roles.flat(); // Handles both strings and arrays
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError('You are not authorized to access this resource', 403));
    }
    next();
  };
};

/**
 * Middleware to authorize users based on their permissions (RBAC).
 * @param {String} action - Action to authorize.
 * @param {String} resource - Resource to authorize.
 */
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

/**
 * Middleware to validate JWT token.
 */
const validateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return next(new AppError('Token is required', 401));
    }
    
    const decoded = await TokenService.verifyToken(token);
    if (!decoded) {
      return next(new AppError('Invalid token', 401));
    }

    req.user = decoded;
    next();
  } catch (error) {
    next(new AppError('Token validation failed', 401));
  }
};

/**
 * Middleware to ensure authentication is required.
 */
const requireAuth = async (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Authentication required', 401));
  }
  next();
};

/**
 * Middleware to check if user has specific merchant permissions
 * @param {String} permission - Required merchant permission
 */
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

/**
 * Middleware to verify user's staff role and branch access
 * @param {String[]} allowedStaffRoles - Array of allowed staff roles
 */
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

      // Add staff details to request for use in subsequent middleware/controllers
      req.staffDetails = staffDetails;
      next();
    } catch (error) {
      logger.error('Staff access verification failed:', error);
      next(new AppError('Staff verification failed', 500));
    }
  };
};

/**
 * Middleware to check if authenticated user owns the requested resource
 * @param {String} paramId - URL parameter containing resource ID
 * @param {String} userField - Field to compare with authenticated user (default: 'userId')
 */
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

/**
 * Middleware to verify API key authentication
 */
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

/**
 * Middleware to check rate limiting by user role
 */
const checkRoleBasedRateLimit = (role) => {
  return async (req, res, next) => {
    try {
      const rateLimits = {
        customer: 100,
        merchant: 200,
        staff: 150,
        admin: 300
      };

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

/**
 * Basic route protection middleware.
 * Ensures the user is authenticated and token is valid.
 */
const protect = async (req, res, next) => {
  try {
    // 1. Check if token exists in headers
    let token;
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return next(new AppError('Please log in to access this route', 401));
    }

    // 2. Verify token
    const decoded = await TokenService.verifyToken(token);
    if (!decoded) {
      return next(new AppError('Invalid token. Please log in again', 401));
    }

    // 3. Check if token is blacklisted
    const isBlacklisted = await TokenService.isTokenBlacklisted(decoded.id);
    if (isBlacklisted) {
      return next(new AppError('Your token has expired. Please log in again', 401));
    }

    // 4. Check if user still exists
    const currentUser = await roleService.getUserById(decoded.id);
    if (!currentUser) {
      return next(new AppError('The user belonging to this token no longer exists', 401));
    }

    // 5. Check if user changed password after token was issued
    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(currentUser.passwordChangedAt.getTime() / 1000, 10);
      if (decoded.iat < changedTimestamp) {
        return next(new AppError('User recently changed password. Please log in again', 401));
      }
    }

    // 6. Track device if info is available
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

    // Grant access to protected route
    req.user = currentUser;
    next();
  } catch (error) {
    logger.error('Protect middleware error:', error);
    next(new AppError('Authentication failed', 401));
  }
};

/**
 * Restricts access to specific user roles.
 * @param  {...string} roles - Allowed roles.
 */
const restrictTo = (...roles) => {
  return async (req, res, next) => {
    try {
      // 1. Ensure user exists in request
      if (!req.user) {
        return next(new AppError('Please login first', 401));
      }

      // 2. Get user's role details
      const userRole = await roleService.getRoleById(req.user.roleId);
      if (!userRole) {
        return next(new AppError('Role not found', 404));
      }

      // 3. Check if user's role is allowed
      if (!roles.includes(userRole.name)) {
        return next(
          new AppError('You do not have permission to perform this action', 403)
        );
      }

      // 4. For merchant and staff roles, perform additional checks
      if (userRole.name === 'merchant') {
        const merchantStatus = await roleService.getMerchantStatus(req.user.merchantId);
        if (merchantStatus !== 'active') {
          return next(
            new AppError('Your merchant account is not active', 403)
          );
        }
      }

      if (userRole.name === 'staff') {
        const staffStatus = await roleService.getStaffStatus(req.user.staffId);
        if (staffStatus !== 'active') {
          return next(
            new AppError('Your staff account is not active', 403)
          );
        }
      }

      // 5. Add role details to request for use in subsequent middleware
      req.userRole = userRole;
      next();
    } catch (error) {
      logger.error('RestrictTo middleware error:', error);
      next(new AppError('Role verification failed', 500));
    }
  };
};

// --------------------------------------------------------------------------
// Module Exports
// --------------------------------------------------------------------------

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
  protect,
  restrictTo,
  legacyAuthenticate,
  legacyRestrictTo
};
