// server/utils/shutdown/serverShutdown.js
const { logger } = require('@utils/logger');

const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;

module.exports = {
  shutdownServer: async (server, io, sequelize) => {
    logger.info('Initiating graceful server shutdown...');

    // Close Socket.IO if present
    if (io) {
      io.close(() => logger.info('Socket.IO server closed'));
    }

    // Close HTTP server and database
    return new Promise((resolve, reject) => {
      server.close(() => {
        logger.info('HTTP server closed successfully');
        if (sequelize) {
          sequelize.close()
            .then(() => {
              logger.info('Database connection closed successfully');
              resolve();
            })
            .catch((err) => {
              logger.error('Failed to close database connection:', { error: err.message });
              reject(err);
            });
        } else {
          resolve();
        }
      });

      setTimeout(() => {
        logger.error(`Forced shutdown after ${GRACEFUL_SHUTDOWN_TIMEOUT}ms timeout`);
        process.exit(1);
      }, GRACEFUL_SHUTDOWN_TIMEOUT);
    });
  }
};