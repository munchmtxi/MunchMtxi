'use strict';
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const restrictToCustomer = (req, res, next) => {
  if (req.user.roleId !== 2) { // Assuming 2 is customer role_id
    logger.warn('Non-customer attempted access', { userId: req.user.id, roleId: req.user.roleId });
    return next(new AppError('This endpoint is for customers only', 403));
  }
  next();
};

module.exports = { restrictToCustomer };