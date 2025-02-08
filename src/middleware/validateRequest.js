// C:\Users\munch\Desktop\MunchMtxi\src\middleware\validateRequest.js

const { validationResult } = require('express-validator');
const AppError = require('@utils/AppError');

/**
 * Middleware to validate requests using express-validator.
 * If validation errors exist, this middleware either passes an error
 * to the global error handler or sends a formatted JSON response.
 *
 * For our Black Lotus Clan, you can choose one approach:
 * 1. Uncomment the "next(new AppError(...))" line to delegate error handling
 *    to your global error middleware.
 * 2. Otherwise, the middleware directly returns a JSON error response.
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Format errors for a consistent API response
    const formattedErrors = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    // Option 1: Pass the error to the global error handler
    // return next(new AppError('Validation failed', 400, formattedErrors));

    // Option 2: Directly return a JSON response with the error details
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: formattedErrors,
      timestamp: new Date().toISOString()
    });
  }

  // Validation passed; proceed to the next middleware/controller
  next();
};

module.exports = validateRequest;
