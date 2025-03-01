// src/middleware/performanceMiddleware.js
const { performance } = require('perf_hooks');
const logger = require('@utils/logger');

/**
 * Middleware utilities for monitoring request performance and API usage.
 * @module performanceMiddleware
 */

/**
 * Configuration options for performance monitoring middleware.
 * @typedef {Object} PerformanceConfig
 * @property {number} [slowThreshold=1000] - Threshold in milliseconds for logging slow requests (default: 1000ms).
 * @property {boolean} [logAllRequests=false] - Whether to log all requests or only slow ones.
 */

/**
 * Default configuration for performance middleware.
 * @type {PerformanceConfig}
 */
const defaultPerformanceConfig = {
  slowThreshold: 1000, // 1 second
  logAllRequests: false
};

/**
 * Middleware to measure and log the performance of HTTP requests.
 * @function performanceMiddleware
 * @param {PerformanceConfig} [config=defaultPerformanceConfig] - Configuration options for performance logging.
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Tracks request duration and logs performance metrics when finished.
 */
const performanceMiddleware = (config = defaultPerformanceConfig) => {
  const { slowThreshold, logAllRequests } = { ...defaultPerformanceConfig, ...config };

  return (req, res, next) => {
    const startTime = performance.now();

    res.on('finish', () => {
      const duration = performance.now() - startTime;
      const durationMs = duration.toFixed(2);
      const requestInfo = {
        method: req.method,
        url: req.originalUrl,
        duration: `${durationMs}ms`,
        status: res.statusCode,
        userId: req.user?.id || 'anonymous'
      };

      // Log only slow requests or all if configured
      const isSlow = duration > slowThreshold;
      if (logAllRequests || isSlow) {
        const logLevel = isSlow ? 'warn' : 'info';
        logger[logLevel]('Request performance', {
          ...requestInfo,
          slow: isSlow ? `Exceeded threshold of ${slowThreshold}ms` : undefined
        });
      }
    });

    next();
  };
};

/**
 * Configuration options for API usage monitoring middleware.
 * @typedef {Object} ApiUsageConfig
 * @property {number} [maxRequests=100] - Maximum requests allowed per user per endpoint in the window.
 * @property {number} [windowMs=60 * 60 * 1000] - Time window in milliseconds for quota reset (default: 1 hour).
 */

/**
 * Default configuration for API usage monitoring.
 * @type {ApiUsageConfig}
 */
const defaultApiUsageConfig = {
  maxRequests: 100,
  windowMs: 60 * 60 * 1000 // 1 hour
};

/**
 * Middleware to monitor and limit API usage based on health monitor quotas.
 * @function apiUsageMiddleware
 * @param {Object} healthMonitor - Health monitor instance with quota tracking methods.
 * @param {ApiUsageConfig} [config=defaultApiUsageConfig] - Configuration options for API usage limits.
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Tracks API calls and enforces rate limits per user and endpoint.
 * @throws {Error} If healthMonitor is not provided or lacks required methods.
 */
const apiUsageMiddleware = (healthMonitor, config = defaultApiUsageConfig) => {
  if (!healthMonitor || typeof healthMonitor.checkQuota !== 'function' || typeof healthMonitor.trackApiCall !== 'function') {
    throw new Error('Invalid healthMonitor: must provide checkQuota and trackApiCall methods');
  }

  const { maxRequests, windowMs } = { ...defaultApiUsageConfig, ...config };

  return catchAsync(async (req, res, next) => {
    const endpoint = req.route?.path || req.path || 'unknown';
    const method = req.method;
    const userId = req.user?.id || 'anonymous';
    const key = `${userId}:${method}:${endpoint}`;

    // Check quota before proceeding
    const quotaExceeded = !healthMonitor.checkQuota(key, maxRequests, windowMs);
    if (quotaExceeded) {
      logger.warn('API quota exceeded', { userId, method, endpoint, maxRequests });
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: `You have exceeded your API quota of ${maxRequests} requests per ${windowMs / 60000} minutes for ${method} ${endpoint}`,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }

    // Track the API call
    healthMonitor.trackApiCall(key);
    logger.debug('API call tracked', { userId, method, endpoint });

    next();
  });
};

/**
 * Simple in-memory health monitor implementation for testing or small-scale use.
 * @class SimpleHealthMonitor
 * @description Tracks API usage with an in-memory store; replace with Redis or DB for production.
 */
class SimpleHealthMonitor {
  constructor() {
    this.usageStore = new Map();
  }

  /**
   * Checks if the quota is exceeded for a given key.
   * @param {string} key - Unique key for tracking (e.g., userId:method:endpoint).
   * @param {number} maxRequests - Maximum allowed requests.
   * @param {number} windowMs - Time window in milliseconds.
   * @returns {boolean} True if within quota, false if exceeded.
   */
  checkQuota(key, maxRequests, windowMs) {
    const now = Date.now();
    const entry = this.usageStore.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > entry.resetTime) {
      this.usageStore.set(key, { count: 0, resetTime: now + windowMs });
      entry.count = 0;
    }

    return entry.count < maxRequests;
  }

  /**
   * Tracks an API call for a given key.
   * @param {string} key - Unique key for tracking.
   */
  trackApiCall(key) {
    const entry = this.usageStore.get(key) || { count: 0, resetTime: Date.now() + defaultApiUsageConfig.windowMs };
    entry.count += 1;
    this.usageStore.set(key, entry);
  }
}

module.exports = {
  performanceMiddleware,
  apiUsageMiddleware,
  SimpleHealthMonitor // Exported for testing or simple use cases
};