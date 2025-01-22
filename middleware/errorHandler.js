const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const config = require('../config/config');

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);
const handleSequelizeValidationError = (err) => new AppError(err.message, 400);

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.nodeEnv === 'development') {
    sendErrorDev(err, res);
  } else if (config.nodeEnv === 'production') {
    let error = { ...err };
    error.message = err.message;

    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (error.name === 'SequelizeValidationError') error = handleSequelizeValidationError(error);

    sendErrorProd(error, res);
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
  if (err.isOperational) {
    res.status(err.statusCode).json({ status: err.status, message: err.message });
  } else {
    logger.error('ERROR 💥', err);
    res.status(500).json({ status: 'error', message: 'Something went wrong!' });
  }
};

module.exports = errorHandler;