// server/app.js
'use strict';
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { setupPassport } = require('@config/passport');
const { setupSwagger } = require('@config/swagger');
const InitMonitoring = require('@config/monitoring');
const SecurityMiddleware = require('@middleware/security');
const { detectLocation, attachGeoLocation } = require('@middleware/locationMiddleware');
const { performanceMiddleware, apiUsageMiddleware } = require('@middleware/performanceMiddleware');
const deviceMiddleware = require('@middleware/deviceDetectionMiddleware');
const responseOptimizer = require('@middleware/responseOptimizerMiddleware');
const { requestLogger } = require('@middleware/requestLogger');
const errorHandler = require('../src/middleware/errorHandler');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

module.exports.setupApp = async () => {
  const app = express();

  logger.info('Setting up core app middleware...');
  app.use(cors());
  logger.info('CORS middleware applied');
  app.use(express.json());
  logger.info('JSON parser middleware applied');
  app.use(express.urlencoded({ extended: true }));
  logger.info('URL-encoded parser middleware applied');
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
  logger.info('Morgan logging middleware applied');
  SecurityMiddleware(app);
  logger.info('Security middleware applied');
  app.use(requestLogger);
  logger.info('Request logger middleware applied');
  app.use(performanceMiddleware);
  logger.info('Performance middleware applied');
  app.use(responseOptimizer);
  logger.info('Response optimizer middleware applied');
  app.use(deviceMiddleware);
  logger.info('Device detection middleware applied');

  app.use(detectLocation({ allowedSources: ['ip', 'gps', 'header'], updateInterval: 12 * 60 * 60 * 1000 }));
  logger.info('Geolocation detection middleware applied');
  app.use(attachGeoLocation);
  logger.info('Geolocation header attachment middleware applied');

  const { healthMonitor } = InitMonitoring(app);
  app.locals.healthMonitor = healthMonitor;
  app.get('/health', async (req, res) => {
    try {
      const health = await healthMonitor.checkSystemHealth();
      res.status(200).json({ status: 'ok', timestamp: new Date().toISOString(), metrics: health });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({ status: 'error', message: 'Health check failed' });
    }
  });
  logger.info('Health check route mounted');

  setupPassport(app);
  logger.info('Passport setup applied');
  setupSwagger(app);
  logger.info('Swagger setup applied');

  app.all('*', (req, res, next) => {
    const error = new AppError(`Route ${req.originalUrl} not found`, 404);
    logger.warn('Unhandled route:', { method: req.method, url: req.originalUrl, ip: req.ip });
    next(error);
  });
  logger.info('Catch-all route mounted');

  app.use(errorHandler);
  logger.info('Error handler middleware applied');

  logger.info('Express app setup complete');
  return app;
};