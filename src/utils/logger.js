/**
 * Logger Module for the Black Lotus Clan
 *
 * This module provides an enhanced logger using Winston and DailyRotateFile,
 * with custom logging levels, helper functions, correlation logging,
 * and a performance monitor for API metrics.
 *
 * @module logger
 */
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('@config/config');
const fs = require('fs');
const path = require('path');

// Ensure logs directory exists
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Define custom log levels and colors
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    verbose: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    verbose: 'cyan'
  }
};

winston.addColors(customLevels.colors);

// Custom log format for console output
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
  })
);

// Set up Daily Rotate File transports
const transports = [
  new DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  }),
  new DailyRotateFile({
    filename: path.join(logDir, 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  }),
  new DailyRotateFile({
    filename: path.join(logDir, 'security-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  }),
  new DailyRotateFile({
    filename: path.join(logDir, 'transactions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  }),
  new DailyRotateFile({
    filename: path.join(logDir, 'api-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'info',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  })
];

// If not in production, log to console with colors and custom format
if (config.nodeEnv !== 'production') {
  transports.push(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      customFormat
    )
  }));
}

// Create the enhanced logger
const logger = winston.createLogger({
  level: 'info',
  levels: customLevels.levels,
  format: winston.format.json(),
  transports,
  exitOnError: false // Do not exit on handled exceptions
});

// Handle uncaught exceptions and unhandled promise rejections
logger.exceptions.handle(
  new DailyRotateFile({
    filename: path.join(logDir, 'exceptions-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d'
  }),
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      customFormat
    )
  })
);

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', { reason });
  throw reason;
});

/**
 * Logs a security-related event.
 *
 * @param {string} message - The log message.
 * @param {object} [metadata={}] - Additional metadata.
 */
function logSecurityEvent(message, metadata = {}) {
  logger.info(message, { ...metadata, type: 'security' });
}

/**
 * Logs a transaction-related event.
 *
 * @param {string} message - The log message.
 * @param {object} [metadata={}] - Additional metadata.
 */
function logTransactionEvent(message, metadata = {}) {
  logger.info(message, { ...metadata, type: 'transaction' });
}

/**
 * Logs an API usage event.
 *
 * @param {string} message - The log message.
 * @param {object} [metadata={}] - Additional metadata.
 */
function logApiEvent(message, metadata = {}) {
  logger.info(message, { ...metadata, type: 'api' });
}

/**
 * Logs a debug event.
 *
 * @param {string} message - The log message.
 * @param {object} [metadata={}] - Additional metadata.
 */
function logDebugEvent(message, metadata = {}) {
  logger.debug(message, metadata);
}

/**
 * Logs a warning event.
 *
 * @param {string} message - The log message.
 * @param {object} [metadata={}] - Additional metadata.
 */
function logWarnEvent(message, metadata = {}) {
  logger.warn(message, metadata);
}

/**
 * Logs an error event.
 *
 * @param {string} message - The log message.
 * @param {object} [metadata={}] - Additional metadata.
 */
function logErrorEvent(message, metadata = {}) {
  logger.error(message, metadata);
}

/**
 * Logs a verbose event.
 *
 * @param {string} message - The log message.
 * @param {object} [metadata={}] - Additional metadata.
 */
function logVerboseEvent(message, metadata = {}) {
  logger.verbose(message, metadata);
}

/**
 * Logs a message with a correlation ID for distributed tracing.
 *
 * @param {string} level - The log level.
 * @param {string} message - The log message.
 * @param {string} correlationId - The correlation identifier.
 * @param {object} [metadata={}] - Additional metadata.
 */
function logWithCorrelation(level, message, correlationId, metadata = {}) {
  logger.log(level, message, { correlationId, ...metadata });
}

/**
 * Logs a deprecation warning.
 *
 * @param {string} message - The deprecation message.
 * @param {object} [metadata={}] - Additional metadata.
 */
function logDeprecation(message, metadata = {}) {
  logger.warn(`Deprecation: ${message}`, { ...metadata, type: 'deprecation' });
}

/**
 * Class for monitoring and tracking performance metrics.
 */
class PerformanceMonitor {
  /**
   * Creates a new instance of PerformanceMonitor.
   */
  constructor() {
    this.metrics = new Map();
    this.apiMetrics = {
      usage: new Map(),
      endpoints: new Map(),
      performance: new Map()
    };
    /**
     * Retention period for metrics in milliseconds.
     * @type {number}
     */
    this.retentionPeriod = 3600000; // 1 hour
  }

  /**
   * Records a general metric.
   *
   * @param {string} name - Name of the metric.
   * @param {number} value - Numeric value of the metric.
   * @param {object} [tags={}] - Additional tags.
   */
  recordMetric(name, value, tags = {}) {
    const key = `${name}:${JSON.stringify(tags)}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key).push({
      value,
      timestamp: Date.now()
    });
    this._cleanOldMetrics(key);
  }

  /**
   * Tracks an API request.
   *
   * @param {string} endpoint - API endpoint.
   * @param {string} method - HTTP method.
   * @param {number} duration - Response duration in milliseconds.
   * @param {number} status - HTTP status code.
   * @param {string} [userId='anonymous'] - User identifier.
   */
  trackRequest(endpoint, method, duration, status, userId = 'anonymous') {
    const key = `${method}:${endpoint}`;
    const now = Date.now();

    // Update endpoint metrics
    const endpointMetrics = this.apiMetrics.endpoints.get(key) || {
      count: 0,
      totalDuration: 0,
      statusCodes: new Map(),
      userCounts: new Map(),
      timestamps: []
    };

    endpointMetrics.count++;
    endpointMetrics.totalDuration += duration;
    endpointMetrics.timestamps.push(now);

    // Update status codes
    const statusCount = endpointMetrics.statusCodes.get(status) || 0;
    endpointMetrics.statusCodes.set(status, statusCount + 1);

    // Update user counts
    const userCount = endpointMetrics.userCounts.get(userId) || 0;
    endpointMetrics.userCounts.set(userId, userCount + 1);

    this.apiMetrics.endpoints.set(key, endpointMetrics);
    this._cleanOldApiMetrics();
  }

  /**
   * Removes old general metrics based on the retention period.
   *
   * @private
   * @param {string} key - Metric key.
   */
  _cleanOldMetrics(key) {
    const cutoff = Date.now() - this.retentionPeriod;
    const metrics = this.metrics.get(key);
    if (metrics) {
      this.metrics.set(key, metrics.filter(m => m.timestamp > cutoff));
    }
  }

  /**
   * Removes old API metrics based on the retention period.
   *
   * @private
   */
  _cleanOldApiMetrics() {
    const cutoff = Date.now() - this.retentionPeriod;
    for (let [key, metrics] of this.apiMetrics.endpoints.entries()) {
      metrics.timestamps = metrics.timestamps.filter(t => t > cutoff);
      if (metrics.timestamps.length === 0) {
        this.apiMetrics.endpoints.delete(key);
      }
    }
  }

  /**
   * Returns a summary of all recorded metrics.
   *
   * @returns {object} Summary of metrics including general, endpoint, and performance data.
   */
  getMetricsSummary() {
    return {
      general: this._getGeneralMetrics(),
      endpoints: this._getEndpointMetrics(),
      performance: this._getPerformanceMetrics()
    };
  }

  /**
   * Generates a summary of general metrics.
   *
   * @private
   * @returns {object} General metrics summary.
   */
  _getGeneralMetrics() {
    const summary = {};
    for (const [key, values] of this.metrics.entries()) {
      const [name, tagsStr] = key.split(':');
      const tags = JSON.parse(tagsStr);
      const numericValues = values.map(v => v.value);
      summary[key] = {
        avg: numericValues.reduce((a, b) => a + b, 0) / numericValues.length,
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
        count: numericValues.length,
        tags
      };
    }
    return summary;
  }

  /**
   * Generates a summary of API endpoint metrics.
   *
   * @private
   * @returns {object} Endpoint metrics summary.
   */
  _getEndpointMetrics() {
    const endpointMetrics = {};
    this.apiMetrics.endpoints.forEach((metrics, endpoint) => {
      endpointMetrics[endpoint] = {
        totalRequests: metrics.count,
        averageResponseTime: metrics.totalDuration / metrics.count,
        statusCodes: Object.fromEntries(metrics.statusCodes),
        uniqueUsers: metrics.userCounts.size,
        requestsPerMinute: this._calculateRequestRate(metrics.timestamps)
      };
    });
    return endpointMetrics;
  }

  /**
   * Generates a summary of overall performance metrics.
   *
   * @private
   * @returns {object} Performance metrics summary.
   */
  _getPerformanceMetrics() {
    let totalRequests = 0;
    let totalDuration = 0;
    let statusCodes = new Map();
    this.apiMetrics.endpoints.forEach(metrics => {
      totalRequests += metrics.count;
      totalDuration += metrics.totalDuration;
      metrics.statusCodes.forEach((count, status) => {
        const current = statusCodes.get(status) || 0;
        statusCodes.set(status, current + count);
      });
    });
    return {
      totalRequests,
      averageResponseTime: totalRequests > 0 ? totalDuration / totalRequests : 0,
      statusCodeDistribution: Object.fromEntries(statusCodes),
      activeEndpoints: this.apiMetrics.endpoints.size
    };
  }

  /**
   * Calculates the number of requests in the last minute.
   *
   * @private
   * @param {number[]} timestamps - Array of request timestamps.
   * @returns {number} Request rate per minute.
   */
  _calculateRequestRate(timestamps) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    return timestamps.filter(t => t > oneMinuteAgo).length;
  }

  /**
   * Resets all recorded metrics.
   */
  resetMetrics() {
    this.metrics.clear();
    this.apiMetrics.endpoints.clear();
  }
}

// Create a single instance of PerformanceMonitor
const performanceMonitor = new PerformanceMonitor();

module.exports = {
  logger,
  logSecurityEvent,
  logTransactionEvent,
  logApiEvent,
  logDebugEvent,
  logWarnEvent,
  logErrorEvent,
  logVerboseEvent,
  logWithCorrelation,
  logDeprecation,
  PerformanceMonitor: performanceMonitor
};
