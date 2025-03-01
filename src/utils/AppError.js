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

    /**
     * HTTP status code.
     * @type {number}
     */
    this.statusCode = statusCode;
    
    /**
     * Error status determined by the status code ('fail' for 4xx errors, 'error' for others).
     * @type {string}
     */
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    /**
     * Flag indicating if the error is operational (trusted error).
     * @type {boolean}
     */
    this.isOperational = true;
    
    /**
     * Custom error code identifier.
     * @type {string|null}
     */
    this.errorCode = errorCode;
    
    /**
     * Additional error details.
     * @type {any|null}
     */
    this.details = details;
    
    /**
     * Contextual metadata.
     * @type {any|null}
     */
    this.meta = meta;
    
    /**
     * Timestamp of when the error instance was created.
     * @type {Date}
     */
    this.timestamp = new Date();

    // Capture stack trace excluding the constructor call.
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Converts the error instance to a plain object.
   * This method is useful for logging or sending error responses.
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
