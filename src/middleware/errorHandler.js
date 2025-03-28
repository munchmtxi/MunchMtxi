const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const config = require('@config/config');
const {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} = require('@utils/specificErrors');

const handleJWTError = () => new AuthenticationError('Invalid token. Please log in again!');
const handleJWTExpiredError = () => new AuthenticationError('Your token has expired! Please log in again.');
const handleSequelizeValidationError = (err) => new ValidationError(err.message, err.errors);
const handleSequelizeUniqueConstraintError = (err) => new ValidationError('Duplicate field value entered', err.errors);
const handleCastError = (err) => new ValidationError(`Invalid ${err.path}: ${err.value}.`, null);

const sendErrorDev = (err, res) => {
  logger.error('ERROR 💥', { error: err || 'Unknown error', stack: err?.stack || new Error().stack });
  res.status(err.statusCode || 500).json({
    status: err.status || 'error',
    error: err || {},
    message: err.message || 'An unexpected error occurred',
    stack: err.stack || new Error().stack
  });
};

const sendErrorProd = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
};

const errorHandler = (err, req, res, next) => {
  let error = err;

  // Explicitly handle AppError instances
  if (error instanceof AppError) {
    logger.error('Operational AppError', { ...error.toJSON(), path: req.path });
    if (config.nodeEnv === 'development') {
      sendErrorDev(error, res);
    } else {
      sendErrorProd(error, res);
    }
    return;
  }

  // Transform specific error types
  error.message = err.message || 'Unknown error';
  error.statusCode = err.statusCode || 500;
  error.status = err.status || 'error';

  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (err.name === 'SequelizeValidationError') error = handleSequelizeValidationError(err);
  if (err.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueConstraintError(err);
  if (err.name === 'SequelizeCastError') error = handleCastError(err);

  // Environment-specific handling
  if (config.nodeEnv === 'development') {
    sendErrorDev(error, res);
  } else if (config.nodeEnv === 'production') {
    if (error.isOperational) {
      sendErrorProd(error, res);
    } else {
      logger.error('ERROR 💥', error);
      error = new AppError('Something went wrong!', 500);
      sendErrorProd(error, res);
    }
  }
};

module.exports = errorHandler;
