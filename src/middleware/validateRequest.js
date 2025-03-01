// src/middleware/validateRequest.js
const { validationResult } = require('express-validator');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

/**
 * Middleware for validating incoming HTTP requests and detecting SQL injection.
 * @module validateRequest
 */

/**
 * Configuration options for request validation middleware.
 * @typedef {Object} ValidateRequestConfig
 * @property {RegExp[]} [sqlPatterns] - Custom SQL injection patterns to detect (default: predefined list).
 * @property {boolean} [logRejections=true] - Whether to log rejected requests.
 * @property {string} [errorFormat='json'] - Format for error responses ('json' or 'plain').
 */

/**
 * Default configuration for request validation.
 * @type {ValidateRequestConfig}
 */
const defaultConfig = {
  sqlPatterns: [
    /(\%27)|(\')/i,          // Single quotes
    /(\%22)|(\")/i,          // Double quotes
    /(\%60)|(`)/,            // Backticks
    /(\%3B)|(;)/i,           // Semicolons
    /(\%2C)|(,)/i,           // Commas
    /union\s+select/i,       // UNION SELECT
    /exec(\s|\+)+(s|x)p\w+/i, // EXEC procedures
    /--/i,                   // SQL comments
    /(\%23)|(#)/i,           // Hash comments
    /drop\s+table/i,         // DROP TABLE
    /insert\s+into/i         // INSERT INTO
  ],
  logRejections: true,
  errorFormat: 'json'
};

/**
 * Checks if a string contains potential SQL injection patterns.
 * @function checkSQLInjection
 * @param {string} value - The string to check for SQL injection.
 * @param {RegExp[]} patterns - Array of regex patterns to test against.
 * @returns {boolean} True if SQL injection is detected, false otherwise.
 * @description Detects common SQL injection attempts in a single string.
 */
const checkSQLInjection = (value, patterns) => {
  if (typeof value !== 'string') return false;
  return patterns.some(pattern => pattern.test(value));
};

/**
 * Recursively checks an object for SQL injection patterns.
 * @function checkObjectForSQLInjection
 * @param {Object} obj - The object to inspect (e.g., req.body, req.query).
 * @param {RegExp[]} patterns - Array of regex patterns to test against.
 * @returns {boolean} True if SQL injection is detected in any field, false otherwise.
 * @description Scans nested objects for potential SQL injection attempts.
 */
const checkObjectForSQLInjection = (obj, patterns) => {
  if (!obj || typeof obj !== 'object') return false;
  for (const key in obj) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      if (checkObjectForSQLInjection(obj[key], patterns)) return true;
    } else if (checkSQLInjection(obj[key], patterns)) {
      return true;
    }
  }
  return false;
};

/**
 * Middleware to validate incoming requests and prevent SQL injection.
 * @function validateRequest
 * @param {Object} schema - Validation schema (e.g., Joi schema or express-validator chain).
 * @param {ValidateRequestConfig} [config=defaultConfig] - Configuration options for validation.
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Validates request data and checks for SQL injection, supporting both Joi and express-validator.
 */
exports.validateRequest = (schema, config = defaultConfig) => {
  const { sqlPatterns, logRejections, errorFormat } = { ...defaultConfig, ...config };

  if (!schema) {
    throw new Error('Validation schema is required');
  }

  return (req, res, next) => {
    // Check for SQL injection
    const hasSQLInjection = checkObjectForSQLInjection(req.body, sqlPatterns) ||
                            checkObjectForSQLInjection(req.query, sqlPatterns) ||
                            checkObjectForSQLInjection(req.params, sqlPatterns);

    if (hasSQLInjection) {
      const errorMsg = 'Potential SQL injection detected';
      if (logRejections) {
        logger.warn(errorMsg, {
          method: req.method,
          path: req.path,
          body: req.body,
          query: req.query,
          params: req.params,
          ip: req.ip
        });
      }
      const errorResponse = errorFormat === 'json' ? {
        status: 'error',
        message: errorMsg,
        timestamp: new Date().toISOString()
      } : errorMsg;
      return res.status(400).json(errorResponse);
    }

    // Validate with Joi schema if provided
    if (schema.validate && typeof schema.validate === 'function') {
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

        const errorMsg = 'Validation failed';
        if (logRejections) {
          logger.warn(errorMsg, { errors: formattedErrors, body: req.body });
        }

        const errorResponse = errorFormat === 'json' ? {
          status: 'error',
          message: errorMsg,
          errors: formattedErrors,
          timestamp: new Date().toISOString()
        } : `${errorMsg}: ${formattedErrors.map(e => e.message).join(', ')}`;
        return res.status(400).json(errorResponse);
      }

      return next();
    }

    // Validate with express-validator if no Joi schema
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(error => ({
        field: error.path || error.param,
        message: error.msg,
        value: error.value
      }));

      const errorMsg = 'Validation failed';
      if (logRejections) {
        logger.warn(errorMsg, { errors: formattedErrors, body: req.body, query: req.query, params: req.params });
      }

      const errorResponse = errorFormat === 'json' ? {
        status: 'error',
        message: errorMsg,
        errors: formattedErrors,
        timestamp: new Date().toISOString()
      } : `${errorMsg}: ${formattedErrors.map(e => e.message).join(', ')}`;
      return res.status(400).json(errorResponse);
    }

    next();
  };
};

/**
 * Middleware to sanitize request data before validation.
 * @function sanitizeRequest
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Trims strings and removes null/undefined values from request data.
 */
exports.sanitizeRequest = () => (req, res, next) => {
  const sanitizeObject = (obj) => {
    if (!obj || typeof obj !== 'object') return;
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = obj[key].trim();
      } else if (obj[key] === null || obj[key] === undefined) {
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitizeObject(obj[key]);
      }
    }
  };

  sanitizeObject(req.body);
  sanitizeObject(req.query);
  sanitizeObject(req.params);
  logger.debug('Request sanitized', { path: req.path, method: req.method });
  next();
};

/**
 * Custom validation function to integrate with external validators.
 * @function customValidateRequest
 * @param {Function} validator - Custom validator function accepting req and returning { error, value }.
 * @param {ValidateRequestConfig} [config=defaultConfig] - Configuration options.
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Allows use of custom validation logic beyond Joi or express-validator.
 */
exports.customValidateRequest = (validator, config = defaultConfig) => {
  if (typeof validator !== 'function') {
    throw new Error('Validator must be a function');
  }

  const { sqlPatterns, logRejections, errorFormat } = { ...defaultConfig, ...config };

  return (req, res, next) => {
    if (checkObjectForSQLInjection(req.body, sqlPatterns) ||
        checkObjectForSQLInjection(req.query, sqlPatterns) ||
        checkObjectForSQLInjection(req.params, sqlPatterns)) {
      const errorMsg = 'Potential SQL injection detected';
      if (logRejections) logger.warn(errorMsg, { method: req.method, path: req.path });
      return res.status(400).json({ status: 'error', message: errorMsg, timestamp: new Date().toISOString() });
    }

    const { error, value } = validator(req);
    if (error) {
      const errorMsg = 'Custom validation failed';
      if (logRejections) logger.warn(errorMsg, { error: error.message });
      const errorResponse = errorFormat === 'json' ? {
        status: 'error',
        message: errorMsg,
        errors: [{ message: error.message }],
        timestamp: new Date().toISOString()
      } : error.message;
      return res.status(400).json(errorResponse);
    }

    req.validatedData = value; // Pass sanitized/validated data downstream
    next();
  };
};

module.exports = {
  validateRequest: exports.validateRequest,
  sanitizeRequest: exports.sanitizeRequest,
  customValidateRequest: exports.customValidateRequest
};