require('module-alias/register'); // Register path aliases
const { app, server } = require('./app');  // Note we're destructuring both app and server
const { sequelize } = require('@models');
const { logger } = require('@utils/logger');
const config = require('@config/config');
const { setupSocket } = require('@config/socket');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err);
  process.exit(1);
});

// Graceful shutdown function
const shutdown = (server, code) => {
  server.close(() => {
    logger.info('Server closed');
    process.exit(code);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

// Start the server
const startServer = async () => {
  try {
    // Validate essential environment variables
    const requiredEnv = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
    requiredEnv.forEach((envVar) => {
      if (!process.env[envVar]) {
        logger.error(`Missing environment variable: ${envVar}`);
        process.exit(1);
      }
    });

    // Database connection check
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // Start the server using the http.Server instance
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // Set up Socket.IO (if not already set up in app.js)
    setupSocket(server);

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(err);
      shutdown(server, 1);
    });

    // Handle SIGTERM
    process.on('SIGTERM', () => {
      logger.info('SIGTERM RECEIVED. Shutting down gracefully');
      shutdown(server, 0);
    });
  } catch (error) {
    logger.error('Unable to start server:', error);
    process.exit(1);
  }
};

startServer();