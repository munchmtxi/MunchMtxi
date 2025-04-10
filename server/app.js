'use strict';

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { setupPassport } = require('@config/passport');
const { setupSwagger } = require('@config/swagger');
const InitMonitoring = require('@config/monitoring');
const securityMiddleware = require('@middleware/security');
const { detectLocation, attachGeoLocation } = require('@middleware/locationMiddleware');
const { performanceMiddleware } = require('@middleware/performanceMiddleware');
const deviceMiddleware = require('@middleware/deviceDetectionMiddleware');
const responseOptimizer = require('@middleware/responseOptimizerMiddleware');
const { requestLogger } = require('@middleware/requestLogger');
const { setupAuthRoutes } = require('@setup/routes/authRouteSetup');
const { logger } = require('@utils/logger');

module.exports.setupApp = async (app) => {
  logger.info('Setting up core app middleware...');

  const corsOptions = {
    origin: 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));
  logger.info('CORS middleware applied with credentials support');

  app.use(cookieParser());
  logger.info('Cookie parser middleware applied');

  app.use(express.json(), (req, res, next) => {
    logger.info('JSON parser executed', { body: req.body });
    next();
  });
  app.use(express.urlencoded({ extended: true }));
  logger.info('URL-encoded parser middleware applied');

  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
  logger.info('Morgan logging middleware applied');

  app.use((req, res, next) => {
    res.setTimeout(10000, () => {
      logger.error('Request timed out', { path: req.path });
      res.status(504).json({ status: 'error', message: 'Request timed out' });
    });
    next();
  });
  logger.info('Request timeout middleware applied');

  securityMiddleware(app);
  logger.info('Security middleware applied');

  app.use(requestLogger());
  logger.info('Request logger middleware applied');

  app.use(performanceMiddleware());
  logger.info('Performance middleware applied');

  app.use(responseOptimizer());
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

  setupAuthRoutes(app);
  logger.info('Authentication routes setup complete');

  logger.info('Express app setup complete');
  return app;
};