// src/middleware/requestLogger.js
const { logger } = require('@utils/logger');

/**
 * Middleware for logging incoming HTTP requests.
 * @module requestLogger
 */

/**
 * Configuration options for request logging middleware.
 * @typedef {Object} RequestLoggerConfig
 * @property {string} [logLevel='info'] - Log level for requests ('info', 'debug', 'warn').
 * @property {string[]} [excludePaths=[]] - Array of paths to exclude from logging.
 * @property {string[]} [maskFields=['password', 'token']] - Fields in body/query to mask for security.
 * @property {boolean} [logHeaders=false] - Whether to include request headers in logs.
 */

/**
 * Default configuration for request logger.
 * @type {RequestLoggerConfig}
 */
const defaultConfig = {
  logLevel: 'info',
  excludePaths: [],
  maskFields: ['password', 'token', 'secret'],
  logHeaders: false
};

/**
 * Middleware to log details of incoming HTTP requests.
 * @function requestLogger
 * @param {RequestLoggerConfig} [config=defaultConfig] - Configuration options for logging.
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Logs request method, URL, and additional details based on configuration.
 */
const requestLogger = (config = defaultConfig) => {
  const { logLevel, excludePaths, maskFields, logHeaders } = { ...defaultConfig, ...config };

  // Validate log level
  if (!['info', 'debug', 'warn'].includes(logLevel)) {
    throw new Error(`Invalid logLevel: ${logLevel}. Must be 'info', 'debug', or 'warn'`);
  }

  /**
   * Masks sensitive fields in an object by replacing values with '[MASKED]'.
   * @param {Object} obj - The object to mask (e.g., req.body, req.query).
   * @returns {Object} A new object with sensitive fields masked.
   */
  const maskSensitiveData = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const masked = { ...obj };
    maskFields.forEach(field => {
      if (field in masked) {
        masked[field] = '[MASKED]';
      }
    });
    return masked;
  };

  return (req, res, next) => {
    const { method, originalUrl, params, query, body, headers } = req;

    // Skip logging for excluded paths
    if (excludePaths.some(path => originalUrl.startsWith(path))) {
      logger.debug(`Request excluded from logging: ${method} ${originalUrl}`);
      return next();
    }

    // Prepare log data
    const logData = {
      method,
      url: originalUrl,
      params: Object.keys(params).length ? params : undefined,
      query: Object.keys(query).length ? maskSensitiveData(query) : undefined,
      body: Object.keys(body).length ? maskSensitiveData(body) : undefined,
      headers: logHeaders ? maskSensitiveData(headers) : undefined,
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    };

    // Log the request
    logger[logLevel](`Incoming Request: ${method} ${originalUrl}`, logData);

    next();
  };
};

/**
 * Middleware to log request errors specifically.
 * @function errorRequestLogger
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Logs request details only when an error occurs, at warn level.
 */
const errorRequestLogger = () => {
  return (err, req, res, next) => {
    const { method, originalUrl, params, query, body } = req;
    logger.warn(`Error in Request: ${method} ${originalUrl}`, {
      method,
      url: originalUrl,
      params: Object.keys(params).length ? params : undefined,
      query: Object.keys(query).length ? query : undefined,
      body: Object.keys(body).length ? body : undefined,
      error: err.message,
      stack: err.stack,
      userId: req.user?.id || 'anonymous',
      timestamp: new Date().toISOString()
    });
    next(err);
  };
};

module.exports = {
  requestLogger,
  errorRequestLogger
};