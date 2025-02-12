// src/middleware/validateRequest.js

const { validationResult } = require('express-validator');
const AppError = require('@utils/AppError');

// Define SQL injection patterns to detect malicious input
const sqlInjectionPatterns = [
  /(\%27)|(\')/i,  // Single quotes
  /(\%22)|(\")/i,  // Double quotes
  /(\%60)|(`)/,    // Backticks
  /(\%3B)|(;)/i,   // Semicolons
  /(\%2C)|(,)/i,   // Commas
  /union\s+select/i,
  /exec(\s|\+)+(s|x)p\w+/i,
];

// Function to check for SQL injection in a string
const checkSQLInjection = (value) => {
  if (typeof value !== 'string') return false;
  return sqlInjectionPatterns.some(pattern => pattern.test(value));
};

// Recursive function to check for SQL injection in nested objects
const checkObjectForSQLInjection = (obj) => {
  if (typeof obj === 'object' && obj !== null) {
    for (let key in obj) {
      if (typeof obj[key] === 'object') {
        if (checkObjectForSQLInjection(obj[key])) return true;
      } else if (checkSQLInjection(obj[key])) {
        return true;
      }
    }
  }
  return false;
};

// Exported validateRequest middleware
exports.validateRequest = (schema) => (req, res, next) => {
  // Check for SQL injection in request body, query, and params
  if (
    checkObjectForSQLInjection(req.body) ||
    checkObjectForSQLInjection(req.query) ||
    checkObjectForSQLInjection(req.params)
  ) {
    return res.status(400).json({
      status: 'error',
      message: 'Potential SQL injection detected',
      timestamp: new Date().toISOString(),
    });
  }

  // Validate using Joi schema if provided
  if (schema.validate) {
    const { error } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const formattedErrors = error.details.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        value: err.context?.value,
      }));

      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        errors: formattedErrors,
        timestamp: new Date().toISOString(),
      });
    }

    return next();
  }

  // Validate using express-validator if no Joi schema is provided
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error) => ({
      field: error.param,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString(),
    });
  }

  next();
};