// /utils/AppError.js
class AppError extends Error {
  constructor(message, statusCode, errorCode = null, details = null, meta = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errorCode = errorCode; // e.g., 'USER_NOT_FOUND'
    this.details = details;       // Additional error details
    this.meta = meta;             // Contextual data

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
