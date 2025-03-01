require('module-alias/register');
const { app, server, io, notificationService } = require('./app');
const { sequelize } = require('@models');
const { logger } = require('@utils/logger');
const config = require('@config/config');
const { setupSocket: configureSocket } = require('@config/socket');
const { validateEnvironment } = require('./utils/envValidation');
const { initializeDeliveryTracking } = require('./utils/deliveryTracking');
const { setupCustomerEvents } = require('./customer/events');
const { setupErrorHandlers } = require('./utils/errorHandling');

const REQUIRED_ENV = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];

let deliveryTrackingInterval;

const startServer = async () => {
  try {
    validateEnvironment(REQUIRED_ENV);
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    server.listen(config.port, () => {
      logger.info(`Server started on port ${config.port} in ${config.nodeEnv} mode`);
    });

    configureSocket(server);
    deliveryTrackingInterval = initializeDeliveryTracking();
    setupCustomerEvents(io, notificationService);

    setupErrorHandlers(server, deliveryTrackingInterval);
  } catch (error) {
    logger.error({
      message: 'Server startup failed',
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      context: 'serverStartup'
    });
    process.exit(1);
  }
};

startServer();