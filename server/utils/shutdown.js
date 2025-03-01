const { logger } = require('@utils/logger');
const { sequelize } = require('@models');

const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;

module.exports = {
  shutdown: async (server, deliveryTrackingInterval, code) => {
    logger.info('Initiating graceful shutdown...');
    if (deliveryTrackingInterval) {
      clearInterval(deliveryTrackingInterval);
      logger.info('Delivery tracking interval cleared');
    }

    server.close(() => {
      logger.info('HTTP server closed successfully');
      sequelize.close()
        .then(() => {
          logger.info('Database connection closed successfully');
          process.exit(code);
        })
        .catch(err => {
          logger.error({
            message: 'Failed to close database connection during shutdown',
            error: err.message,
            stack: err.stack,
            timestamp: new Date().toISOString(),
            context: 'databaseShutdown'
          });
          process.exit(1);
        });
    });

    setTimeout(() => {
      logger.error({
        message: `Forced shutdown triggered after ${GRACEFUL_SHUTDOWN_TIMEOUT}ms timeout`,
        timestamp: new Date().toISOString(),
        context: 'shutdownTimeout'
      });
      process.exit(1);
    }, GRACEFUL_SHUTDOWN_TIMEOUT);
  }
};