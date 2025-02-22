// src/middleware/performanceMiddleware.js
const { performance } = require('perf_hooks');
const { logger } = require('@utils/logger');  // Change to destructure logger

const performanceMiddleware = (req, res, next) => {
  const start = performance.now();
  
  res.on('finish', () => {
    const duration = performance.now() - start;
    logger.info('Request performance', {
      method: req.method,
      url: req.originalUrl,
      duration: `${duration.toFixed(2)}ms`,
      status: res.statusCode
    });
  });
  
  next();
};

const apiUsageMiddleware = (healthMonitor) => {
  return (req, res, next) => {
    const endpoint = req.route?.path || req.path;
    const method = req.method;
    const userId = req.user?.id || 'anonymous';

    if (!healthMonitor.checkQuota(endpoint, method, userId)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'You have exceeded your API quota for this endpoint'
      });
    }

    healthMonitor.trackApiCall(endpoint, method, userId);
    next();
  };
};

module.exports = {
  performanceMiddleware,
  apiUsageMiddleware
};