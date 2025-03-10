/**
 * Class representing an application-specific error.
 * Extends the built-in Error class to include additional properties
 * such as HTTP status code, custom error code, and metadata.
 *
 * @extends Error
  */
/**
 * Class representing an application-specific error.
 * Extends the built-in Error class to include additional properties
 * such as HTTP status code, custom error code, and metadata.
 *
 * @extends Error
 */
class AppError extends Error {
  /**
   * Creates an instance of AppError.
   *
   * @param {string} message - The error message.
   * @param {number} statusCode - HTTP status code associated with the error.
   * @param {string|null} [errorCode=null] - Custom error code identifier (e.g., 'USER_NOT_FOUND').
   * @param {any|null} [details=null] - Additional details regarding the error.
   * @param {any|null} [meta=null] - Contextual metadata to assist in debugging.
   */
  constructor(message, statusCode, errorCode = null, details = null, meta = null) {
    super(message);

    // HTTP status code.
    this.statusCode = statusCode;
    
    // Determine error status based on the HTTP code:
    // 'fail' for 4xx errors, 'error' for others.
    this.status = statusCode.toString().startsWith('4') ? 'fail' : 'error';
    
    // Indicates whether the error is operational (trusted error).
    this.isOperational = true;
    
    // Custom error code identifier.
    this.errorCode = errorCode;
    
    // Additional error details.
    this.details = details;
    
    // Contextual metadata.
    this.meta = meta;
    
    // Timestamp when the error instance was created.
    this.timestamp = new Date();

    // Capture the stack trace excluding the constructor call.
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts the error instance to a plain object.
   * Useful for logging or sending error responses.
   *
   * @returns {object} A plain object containing error details.
   */
  toJSON() {
    return {
      message: this.message,
      statusCode: this.statusCode,
      status: this.status,
      errorCode: this.errorCode,
      details: this.details,
      meta: this.meta,
      timestamp: this.timestamp,
      stack: this.stack
    };
  }
}

module.exports = AppError;
