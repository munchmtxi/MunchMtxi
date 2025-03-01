const Cors = require('cors');
const Morgan = require('morgan');
const SecurityMiddleware = require('@middleware/security');
const RequestLogger = require('@middleware/requestLogger');
const { performanceMiddleware, apiUsageMiddleware } = require('@middleware/performanceMiddleware');
const { setupPassport } = require('@config/passport');
const { setupSwagger } = require('@config/swagger');
const ErrorHandler = require('@middleware/errorHandler');
const deviceMiddleware = require('@middleware/deviceDetectionMiddleware');
const responseOptimizer = require('@middleware/responseOptimizerMiddleware');
const { logger } = require('@utils/logger');

module.exports = {
  setupApp: (app) => {
    app.use(Cors());
    app.use(Express.json());
    app.use(Express.urlencoded({ extended: true }));
    app.use(Morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
    SecurityMiddleware(app);
    app.use(RequestLogger);
    app.use(performanceMiddleware);
    app.use(apiUsageMiddleware(app.locals.healthMonitor));
    app.use(responseOptimizer);
    setupPassport(app);
    setupSwagger(app);
    app.use(deviceMiddleware);
    app.use(ErrorHandler);
  }
};