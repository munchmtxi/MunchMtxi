require('module-alias/register');
const { app, server } = require('./app');
const { sequelize } = require('@models');
const { logger } = require('@utils/logger');
const config = require('@config/config');
const { setupSocket } = require('@config/socket');
const deliveryTrackingService = require('@services/deliveryTrackingService');

// Constants
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;
const DELIVERY_TRACKING_INTERVAL = 5 * 60 * 1000; // 5 minutes
const REQUIRED_ENV = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];

let deliveryTrackingInterval;

/**
 * Graceful shutdown handler
 */
const shutdown = async (server, code) => {
  logger.info('Initiating graceful shutdown...');
  
  // Clear the delivery tracking interval
  if (deliveryTrackingInterval) {
    clearInterval(deliveryTrackingInterval);
  }

  // Close server
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close database connection
    sequelize.close().then(() => {
      logger.info('Database connection closed');
      process.exit(code);
    }).catch((err) => {
      logger.error('Error closing database connection:', err);
      process.exit(1);
    });
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error(`Forced shutdown after ${GRACEFUL_SHUTDOWN_TIMEOUT}ms`);
    process.exit(1);
  }, GRACEFUL_SHUTDOWN_TIMEOUT);
};

/**
 * Validate environment variables
 */
const validateEnvironment = () => {
  const missingVars = REQUIRED_ENV.filter(envVar => !process.env[envVar]);
  if (missingVars.length > 0) {
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
  }
};

/**
 * Initialize delivery tracking service
 */
const initializeDeliveryTracking = () => {
  // Initial run
  deliveryTrackingService.processFailedNotifications()
    .catch(err => logger.error('Error in delivery tracking:', err));

  // Schedule recurring runs
  deliveryTrackingInterval = setInterval(() => {
    deliveryTrackingService.processFailedNotifications()
      .catch(err => logger.error('Error in delivery tracking:', err));
  }, DELIVERY_TRACKING_INTERVAL);

  logger.info('Delivery tracking service initialized');
};

/**
 * Start the server and initialize services
 */
const startServer = async () => {
  try {
    // Validate environment
    validateEnvironment();

    // Check database connection
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    // Start HTTP server
    server.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // Setup Socket.IO
    setupSocket(server);

    // Initialize delivery tracking
    initializeDeliveryTracking();

    // Register shutdown handlers
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received');
      shutdown(server, 0);
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received');
      shutdown(server, 0);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err);
  shutdown(server, 1);
});

// Start the server
startServer();