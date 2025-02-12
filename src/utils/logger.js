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

// PerformanceMonitor utility for tracking metrics
const PerformanceMonitor = {
  metrics: new Map(),
  
  recordMetric(name, value, tags = {}) {
    const key = `${name}:${JSON.stringify(tags)}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    this.metrics.get(key).push({
      value,
      timestamp: Date.now()
    });
    
    // Keep only last hour of metrics
    const oneHourAgo = Date.now() - 3600000;
    this.metrics.set(
      key,
      this.metrics.get(key).filter(m => m.timestamp > oneHourAgo)
    );
  },

  getMetricsSummary() {
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
};

module.exports = {
  logger,
  logSecurityEvent,
  logTransactionEvent,
  logApiEvent,
  PerformanceMonitor
};
