const cors = require('cors');
const express = require('express');
const morgan = require('morgan');
const securityMiddleware = require('@middleware/security');
const { sanitizeRequest } = require('@middleware/validateRequest');
const userActivityMiddleware = require('@middleware/userActivityMiddleware');
const responseOptimizer = require('@middleware/responseOptimizerMiddleware');
const { requestLogger } = require('@middleware/requestLogger');
const { rateLimiter } = require('@middleware/rateLimiter');
const { performanceMiddleware, apiUsageMiddleware } = require('@middleware/performanceMiddleware');
const errorHandler = require('@middleware/errorHandler');
const deviceDetectionMiddleware = require('@middleware/deviceDetectionMiddleware');
const authMiddleware = require('@middleware/authMiddleware');
const { setupPassport } = require('@config/passport');
const { setupSwagger } = require('@config/swagger');
const { setupGeolocationMiddleware } = require('./geolocationMiddlewareSetup');
const { setupCoreRoutes } = require('../routes/coreRoutesSetup'); // Relative path from server/setup/app/
const { logger } = require('@utils/logger');

module.exports = {
  setupCoreApp: (app, healthMonitor) => {
    logger.info('Setting up core app middleware...');

    app.use(cors());
    logger.info('CORS middleware applied');

    app.use(express.json());
    logger.info('JSON parser middleware applied');

    app.use(express.urlencoded({ extended: true }));
    logger.info('URL-encoded parser middleware applied');

    app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
    logger.info('Morgan logging middleware applied');

    securityMiddleware(app);
    logger.info('Security middleware applied');

    app.use(sanitizeRequest());
    logger.info('Sanitize request middleware applied');

    app.use(userActivityMiddleware());
    logger.info('User activity middleware applied');

    app.use(responseOptimizer());
    logger.info('Response optimizer middleware applied');

    app.use(requestLogger());
    logger.info('Request logger middleware applied');

    app.use(rateLimiter);
    logger.info('Rate limiter middleware applied');

    app.use(performanceMiddleware());
    logger.info('Performance middleware applied');

    app.use(apiUsageMiddleware(healthMonitor));
    logger.info('API usage middleware applied');

    logger.info('Setting up geolocation middleware...');
    setupGeolocationMiddleware(app);
    logger.info('Geolocation middleware setup complete');

    app.use(deviceDetectionMiddleware);
    logger.info('Device detection middleware applied');

    app.use(authMiddleware.authenticate);
    logger.info('Auth middleware applied');

    setupPassport(app);
    logger.info('Passport setup applied');

    setupSwagger(app);
    logger.info('Swagger setup applied');

    // Add core routes setup
    logger.info('Setting up core routes...');
    setupCoreRoutes(app);
    logger.info('Core routes setup complete');

    app.use(errorHandler);
    logger.info('Error handler middleware applied');

    logger.info('Core Express app setup complete');
  }
};