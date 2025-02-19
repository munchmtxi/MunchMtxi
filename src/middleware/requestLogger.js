const logger = require('@utils/logger');

// Define the middleware function logRequest
const logRequest = (req, res, next) => {
  logger.info(`Incoming Request: ${req.method} ${req.originalUrl}`, {
    method: req.method,
    url: req.originalUrl,
    params: req.params,
    query: req.query,
    body: req.body,
  });
  next();
};

// Export the logRequest function
module.exports = { logRequest };
