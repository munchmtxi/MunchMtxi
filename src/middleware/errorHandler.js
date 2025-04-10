'use strict';

const { logger } = require('@utils/logger');
const AppError = require('@utils/appError');
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
    error: {
      message: err.message || 'An unexpected error occurred',
      statusCode: err.statusCode || 500,
      status: err.status || 'error',
      errorCode: err.errorCode || null,
      details: err.details || null,
      meta: err.meta || null,
      timestamp: new Date().toISOString(),
      stack: err.stack || new Error().stack,
    },
    message: err.message || 'An unexpected error occurred',
    stack: err.stack || new Error().stack,
  });
};

const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    logger.error('ERROR 💥', { error: err });
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
    });
  }
};

const forceJsonMiddleware = (req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  logger.info('Setting Content-Type to application/json');
  next();
};

const errorHandler = (err, req, res, next) => {
  logger.info('errorHandler reached', { error: err.message, instanceofAppError: err instanceof AppError });

  let error = err;

  // Handle specific error types
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  else if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
  else if (err.name === 'SequelizeValidationError') error = handleSequelizeValidationError(err);
  else if (err.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueConstraintError(err);
  else if (err.name === 'SequelizeCastError') error = handleCastError(err);
  else if (!(err instanceof AppError)) {
    error = new AppError(err.message || 'Something went wrong', err.statusCode || 500);
  }

  const statusCode = error.statusCode || 500;
  const status = error.status || (statusCode >= 400 && statusCode < 500 ? 'fail' : 'error');

  if (config.nodeEnv === 'development') {
    sendErrorDev(error, res);
  } else if (config.nodeEnv === 'production') {
    sendErrorProd(error, res);
  }
};

module.exports = {
  errorHandler,
  forceJsonMiddleware,
};