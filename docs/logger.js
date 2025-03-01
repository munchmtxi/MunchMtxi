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

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new DailyRotateFile({
      filename: path.join(logDir, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d' // Keep logs for 14 days
    }),
    new DailyRotateFile({
      filename: path.join(logDir, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
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
  ],
  exitOnError: false, // Do not exit on handled exceptions
});

// If we're not in production, log to the console too
if (config.nodeEnv !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

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
      winston.format.colorize(),
      winston.format.simple()
    )
  })
);

process.on('unhandledRejection', (reason) => {
  throw reason;
});

// Helper function to log security-related events
function logSecurityEvent(message, metadata = {}) {
  logger.info({ message, ...metadata, type: 'security' });
}

// Helper function to log transaction-related events
function logTransactionEvent(message, metadata = {}) {
  logger.info({ message, ...metadata, type: 'transaction' });
}

// Helper function to log API usage events
function logApiEvent(message, metadata = {}) {
  logger.info({ message, ...metadata, type: 'api' });
}

// Enhanced PerformanceMonitor class
class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.apiMetrics = {
      usage: new Map(),
      endpoints: new Map(),
      performance: new Map()
    };
    this.retentionPeriod = 3600000; // 1 hour in milliseconds
  }

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

  _cleanOldMetrics(key) {
    const oneHourAgo = Date.now() - this.retentionPeriod;
    const metrics = this.metrics.get(key);
    if (metrics) {
      this.metrics.set(
        key,
        metrics.filter(m => m.timestamp > oneHourAgo)
      );
    }
  }

  _cleanOldApiMetrics() {
    const oneHourAgo = Date.now() - this.retentionPeriod;
    
    this.apiMetrics.endpoints.forEach((metrics, key) => {
      metrics.timestamps = metrics.timestamps.filter(t => t > oneHourAgo);
      if (metrics.timestamps.length === 0) {
        this.apiMetrics.endpoints.delete(key);
      }
    });
  }

  getMetricsSummary() {
    const summary = {
      general: this._getGeneralMetrics(),
      endpoints: this._getEndpointMetrics(),
      performance: this._getPerformanceMetrics()
    };

    return summary;
  }

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

  _calculateRequestRate(timestamps) {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRequests = timestamps.filter(t => t > oneMinuteAgo).length;
    return recentRequests;
  }
}

// Create single instance
const performanceMonitor = new PerformanceMonitor();

module.exports = {
  logger,
  logSecurityEvent,
  logTransactionEvent,
  logApiEvent,
  PerformanceMonitor: performanceMonitor
};
