// middleware/requestLogger.js
const logger = require('../utils/logger');

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

module.exports = { requestLogger };
