const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');
const winston = require('winston');
const statusMonitor = require('express-status-monitor');

module.exports = function initMonitoring(app) {
  // Sentry initialization
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new ProfilingIntegration(),
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app })
    ],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
  });

  // Winston logger
  const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
      new winston.transports.File({ filename: 'logs/combined.log' })
    ],
  });

  // Status monitor
  app.use(statusMonitor());
  
  return { Sentry, logger };
};