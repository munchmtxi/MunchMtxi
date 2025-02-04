// /middlewares/errorHandler.js
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');
const config = require('@config/config');
const {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError
} = require('../utils/specificErrors');

const handleJWTError = () => new AuthenticationError('Invalid token. Please log in again!');
const handleJWTExpiredError = () => new AuthenticationError('Your token has expired! Please log in again.');
const handleSequelizeValidationError = (err) => new ValidationError(err.message, err.errors);
const handleSequelizeUniqueConstraintError = (err) => new ValidationError('Duplicate field value entered', err.errors);
const handleCastError = (err) => new ValidationError(`Invalid ${err.path}: ${err.value}.`, null);

const errorHandler = (err, req, res, next) => {
  // Ensure err is an instance of AppError
  let error = { ...err };
  error.message = err.message;

  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (err.name === 'SequelizeValidationError') error = handleSequelizeValidationError(error);
  if (err.name === 'SequelizeUniqueConstraintError') error = handleSequelizeUniqueConstraintError(error);
  if (err.name === 'SequelizeCastError') error = handleCastError(error);

  if (config.nodeEnv === 'development') {
    sendErrorDev(error, res);
  } else if (config.nodeEnv === 'production') {
    if (error.isOperational) {
      sendErrorProd(error, res);
    } else {
      // Log the error for developers
      logger.error('ERROR 💥', error);
      // Send generic message
      res.status(500).json({ status: 'error', message: 'Something went wrong!' });
    }
  }
};

const sendErrorDev = (err, res) => {
  logger.error('ERROR 💥', err);
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  res.status(err.statusCode).json({
    status: err.status,
    message: err.message
  });
};

module.exports = errorHandler;
