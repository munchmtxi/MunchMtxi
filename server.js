const app = require('./app');
const { sequelize } = require('./models');
const logger = require('./utils/logger');
const config = require('./config/config');

const startServer = async () => {
  try {
    // Database connection check
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Start the server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // Handle unhandled rejections
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(err);
      server.close(() => process.exit(1));
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      logger.info('SIGTERM RECEIVED. Shutting down gracefully');
      server.close(() => logger.info('Process terminated!'));
    });

  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();