// src/middleware/index.js
const { logRequest } = require('@middleware/requestLogger');
const { performanceMiddleware, apiUsageMiddleware } = require('@middleware/performanceMiddleware');
const { rateLimiter, geoLocationLimiter, checkRoleBasedRateLimit } = require('@middleware/rateLimiter'); 
const { securityMiddleware } = require('@middleware/security');
const { authenticate, hasMerchantPermission } = require('@middleware/authMiddleware');
const deviceMiddleware = require('@middleware/deviceDetectionMiddleware');
const responseOptimizer = require('@middleware/responseOptimizerMiddleware');
const merchantMetricsMiddleware = require('@middleware/merchantMetricsMiddleware').handle;
const { validateRequest } = require('@middleware/validateRequest');
const businessTypeMiddleware = require('@middleware/businessTypeMiddleware');

module.exports = {
 // Existing exports
 logRequest,
 performanceMiddleware,
 apiUsageMiddleware,
 
 // Rate limiter exports
 rateLimiter,
 geoLocationLimiter,
 checkRoleBasedRateLimit,
 
 // Security and auth
 securityMiddleware,
 authenticate,
 hasMerchantPermission,
 
 // Device and response
 deviceMiddleware,
 responseOptimizer: responseOptimizer(), // Call the function to get middleware
 
 // Metrics and validation
 merchantMetricsMiddleware,
 validateRequest,
 
 // Business type middleware (spread all exports)
 ...businessTypeMiddleware
};