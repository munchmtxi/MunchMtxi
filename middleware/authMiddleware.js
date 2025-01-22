const passport = require('passport');
const AppError = require('../utils/AppError');

const authenticate = passport.authenticate('jwt', { session: false });

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You are not authorized to access this resource', 403));
    }
    next();
  };
};

module.exports = { authenticate, authorizeRoles };