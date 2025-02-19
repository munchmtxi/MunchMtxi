const passport = require('passport');
const AppError = require('@utils/AppError');
const roleService = require('@services/roleService');
const { trackDevice } = require('@services/deviceService');
const TokenService = require('@services/tokenService'); // Newly added import

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
    const allowedRoles = roles.flat(); // This handles both strings and arrays
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

module.exports = { authenticate, authorizeRoles, authorize, validateToken, requireAuth };