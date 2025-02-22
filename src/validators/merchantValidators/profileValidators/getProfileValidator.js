// src/validators/merchantValidators/profileValidators/getProfileValidator.js
const { validationResult } = require('express-validator');
const AppError = require('@utils/AppError');

// Change to export the middleware function directly instead of a class
exports.validateGetProfile = (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(
        'Validation error',
        400,
        'VALIDATION_ERROR',
        errors.array()
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};