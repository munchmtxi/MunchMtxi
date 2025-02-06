// middleware/requestLogger.js
const logger = require('@utils/logger');

// Define the middleware function
const requestLogger = (req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    query: req.query,
    body: req.body,
  });
  next();
};

// Export the middleware function
module.exports = requestLogger;