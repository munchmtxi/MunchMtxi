// server/utils/errorHandling.js
const { logger } = require('@utils/logger');
const { shutdownServer } = require('@serverUtils/shutdown/serverShutdown');

module.exports = {
  setupErrorHandlers: (server, io, sequelize) => {
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error: error.message });
      shutdownServer(server, io, sequelize).then(() => process.exit(1)).catch(() => process.exit(1));
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Rejection:', { reason: reason.message || reason });
      shutdownServer(server, io, sequelize).then(() => process.exit(1)).catch(() => process.exit(1));
    });

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down...');
      shutdownServer(server, io, sequelize).then(() => process.exit(0)).catch(() => process.exit(1));
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down...');
      shutdownServer(server, io, sequelize).then(() => process.exit(0)).catch(() => process.exit(1));
    });

    logger.info('Error handlers setup complete');
  }
};