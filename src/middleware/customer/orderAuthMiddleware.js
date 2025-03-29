// src/middleware/customer/orderAuthMiddleware.js
const AppError = require('@utils/AppError');

// Role IDs from your flow
const ROLES = {
  ADMIN: 1,
  CUSTOMER: 2,
  DRIVER: 3,
  STAFF: 4,
  MERCHANT: 19,
};

/**
 * Middleware to restrict access based on user role
 * @param {number} requiredRole - The role ID required to access the route
 * @returns {Function} - Express middleware function
 */
const orderAuthMiddleware = (requiredRole) => {
  return (req, res, next) => {
    // Ensure user is authenticated and req.user is set
    if (!req.user || !req.user.role_id) {
      return next(new AppError('Authentication required', 401, 'UNAUTHENTICATED'));
    }

    const userRole = req.user.role_id;

    // Allow admin to access all routes
    if (userRole === ROLES.ADMIN) {
      return next();
    }

    // Check if user's role matches the required role
    if (userRole !== requiredRole) {
      return next(new AppError(
        'You do not have permission to perform this action',
        403,
        'FORBIDDEN'
      ));
    }

    // Proceed if role matches
    next();
  };
};

// Specific middleware for each role
const restrictToCustomer = orderAuthMiddleware(ROLES.CUSTOMER);
const restrictToMerchant = orderAuthMiddleware(ROLES.MERCHANT);
const restrictToDriver = orderAuthMiddleware(ROLES.DRIVER);
const restrictToStaff = orderAuthMiddleware(ROLES.STAFF);

module.exports = {
  restrictToCustomer,
  restrictToMerchant,
  restrictToDriver,
  restrictToStaff,
  orderAuthMiddleware, // Export generic version for flexibility
};