// src/middleware/performanceMiddleware.js
const { PerformanceMonitor } = require('../utils/logger');

const performanceMiddleware = (req, res, next) => {
  const start = process.hrtime();
  
  // Add response listener
  res.on('finish', () => {
    const [seconds, nanoseconds] = process.hrtime(start);
    const duration = seconds * 1000 + nanoseconds / 1000000;
    
    PerformanceMonitor.recordMetric('http_response_time', duration, {
      path: req.path,
      method: req.method,
      status: res.statusCode
    });
  });
  
  next();
};

module.exports = performanceMiddleware;