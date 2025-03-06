const Cors = require('cors');
const Morgan = require('morgan');
const Express = require('express'); // Added explicit import for clarity
const SecurityMiddleware = require('@middleware/security');
const RequestLogger = require('@middleware/requestLogger');
const { performanceMiddleware, apiUsageMiddleware } = require('@middleware/performanceMiddleware');
const { setupPassport } = require('@config/passport');
const { setupSwagger } = require('@config/swagger');
const ErrorHandler = require('@middleware/errorHandler');
const deviceMiddleware = require('@middleware/deviceDetectionMiddleware');
const responseOptimizer = require('@middleware/responseOptimizerMiddleware');
const { setupGeolocationMiddleware } = require('./app/geolocationMiddlewareSetup'); // New import
const { logger } = require('@utils/logger');

module.exports = {
  setupApp: (app) => {
    logger.info('Setting up core app middleware...');
    app.use(Cors());
    logger.info('CORS middleware applied');
    app.use(Express.json());
    logger.info('JSON parser middleware applied');
    app.use(Express.urlencoded({ extended: true }));
    logger.info('URL-encoded parser middleware applied');
    app.use(Morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
    logger.info('Morgan logging middleware applied');
    SecurityMiddleware(app);
    logger.info('Security middleware applied');
    app.use(RequestLogger);
    logger.info('Request logger middleware applied');
    app.use(performanceMiddleware);
    logger.info('Performance middleware applied');
    app.use(apiUsageMiddleware(app.locals.healthMonitor));
    logger.info('API usage middleware applied');
    app.use(responseOptimizer);
    logger.info('Response optimizer middleware applied');
    setupPassport(app);
    logger.info('Passport setup applied');
    setupSwagger(app);
    logger.info('Swagger setup applied');
    app.use(deviceMiddleware);
    logger.info('Device detection middleware applied');

    // Add geolocation middleware
    setupGeolocationMiddleware(app); // New call to include detectLocation and attachGeoLocation
    logger.info('Geolocation-specific middleware applied');

    app.use(ErrorHandler);
    logger.info('Error handler middleware applied');
    logger.info('Core Express app setup complete');
  }
};