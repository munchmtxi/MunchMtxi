// src/middleware/validateRequest.js
const { validationResult } = require('express-validator');
const AppError = require('@utils/AppError');

// Changed to a named export
exports.validateRequest = (schema) => (req, res, next) => {
  // For Joi schema validation
  if (schema.validate) {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const formattedErrors = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.context?.value
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: formattedErrors,
        timestamp: new Date().toISOString()
      });
    }
    return next();
  }

  // For express-validator validation
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }

  next();
};