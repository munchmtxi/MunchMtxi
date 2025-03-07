/**
 * @module middlewares/errorHandler
 * @description Centralized error handling middleware for Express.
 * Transforms various error types (e.g., JWT, Sequelize errors) into a unified format,
 * logs them appropriately, and sends error responses based on the environment.
 */

const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const config = require('@config/config');
const {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} = require('@utils/specificErrors');

/**
 * Handles JWT errors by returning an AuthenticationError.
 *
 * @returns {AuthenticationError} A new AuthenticationError indicating an invalid token.
 */
const handleJWTError = () => new AuthenticationError('Invalid token. Please log in again!');

/**
 * Handles expired JWT errors by returning an AuthenticationError.
 *
 * @returns {AuthenticationError} A new AuthenticationError indicating an expired token.
 */
const handleJWTExpiredError = () => new AuthenticationError('Your token has expired! Please log in again.');

/**
 * Converts a Sequelize validation error into a ValidationError.
 *
 * @param {Object} err - The original Sequelize error object.
 * @returns {ValidationError} A new ValidationError with the provided message and errors.
 */
const handleSequelizeValidationError = (err) => new ValidationError(err.message, err.errors);

/**
 * Converts a Sequelize unique constraint error into a ValidationError.
 *
 * @param {Object} err - The original Sequelize error object.
 * @returns {ValidationError} A new ValidationError indicating duplicate field values.
 */
const handleSequelizeUniqueConstraintError = (err) => new ValidationError('Duplicate field value entered', err.errors);

/**
 * Converts a Sequelize cast error into a ValidationError.
 *
 * @param {Object} err - The original Sequelize error object.
 * @returns {ValidationError} A new ValidationError indicating an invalid field value.
 */
const handleCastError = (err) => new ValidationError(`Invalid ${err.path}: ${err.value}.`, null);

/**
 * Sends a detailed error response in development mode.
 *
 * @param {AppError} err - The error object.
 * @param {Object} res - Express response object.
 */
const sendErrorDev = (err, res) => {
  logger.error('ERROR 💥', { error: err || 'Unknown error', stack: err?.stack || new Error().stack });
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    error: err || {},
    message: err.message || 'An unexpected error occurred',
    stack: err.stack || new Error().stack
  });
};

/**
 * Sends a simplified error response in production mode for operational errors.
 *
 * @param {AppError} err - The error object.
 * @param {Object} res - Express response object.
 */
const sendErrorProd = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
};

/**
 * Centralized error handling middleware for Express.
 *
 * This middleware transforms known errors (e.g., JWT errors, Sequelize errors) into a unified format.
 * It then sends detailed error information in development and a simplified message in production.
 *
 * @param {Error} err - The error object.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const errorHandler = (err, req, res, next) => {
  // Ensure error has a statusCode and status
  let error = { ...err };
  error.message = err.message || 'Unknown error';
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'error';

  // Transform specific error types
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (err.name === 'SequelizeValidationError') error = handleSequelizeValidationError(err);
  if (err.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueConstraintError(err);
  if (err.name === 'SequelizeCastError') error = handleCastError(err);

  // Environment-specific error handling
  if (config.nodeEnv === 'development') {
    sendErrorDev(error, res);
  } else if (config.nodeEnv === 'production') {
    if (error.isOperational) {
      sendErrorProd(error, res);
    } else {
      // Log non-operational errors and send a generic response
      logger.error('ERROR 💥', error);
      res.status(500).json({
        status: 'error',
        message: 'Something went wrong!'
      });
    }
  }
};

module.exports = errorHandler;
