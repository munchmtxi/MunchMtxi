'use strict';
require('module-alias/register');
require('dotenv').config();
const { createServer } = require('http');
const { Router } = require('express');
const { sequelize } = require('@models');
const { logger } = require('@utils/logger');
const { setupApp } = require('@server/app');
const { setupSocket } = require('@server/socket');
const { setupCommonServices } = require('@setup/services/commonServices');
const { setupNotificationService } = require('@setup/services/notificationServices');
const authService = require('@services/common/authService'); // Direct import
const { setupMerchantProfile } = require('@setup/merchant/profile/profileSetup');
const { getProfile } = require('@controllers/merchant/profile/getProfile');
const authMiddleware = require('@middleware/authMiddleware');
const { setupNotificationRoutes } = require('@setup/routes/notificationRoutesSetup');
const { setupNotifications } = require('@setup/notifications/notificationSetup');
const { setupAuthRoutes } = require('@setup/routes/authRouteSetup');
const { setupCustomerEvents } = require('@setup/customer/events');

const REQUIRED_ENV = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;

/**
 * Validates required environment variables.
 * @param {Array<string>} requiredEnv - List of required environment variable keys.
 */
const validateEnvironment = (requiredEnv) => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error('Missing required environment variables:', { missing });
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  logger.info('Environment variables validated successfully');
};

/**
 * Gracefully shuts down the server, closing resources like Socket.IO, HTTP server, and database connections.
 * @param {Object} server - HTTP server instance.
 * @param {Object} io - Socket.IO instance.
 * @param {Object} sequelize - Sequelize instance.
 * @returns {Promise<void>}
 */
const shutdownServer = async (server, io, sequelize) => {
  logger.info('Initiating graceful server shutdown...');

  if (io) {
    io.close(() => logger.info('Socket.IO server closed'));
  }

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
};

/**
 * Sets up error handlers for uncaught exceptions, unhandled rejections, and termination signals.
 * @param {Object} server - HTTP server instance.
 * @param {Object} io - Socket.IO instance.
 * @param {Object} sequelize - Sequelize instance.
 */
const setupErrorHandlers = (server, io, sequelize) => {
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
};

/**
 * Sets up the merchant profile route with authentication middleware.
 * @param {Object} app - Express app instance.
 */
const setupGetProfile = (app) => {
  const merchantProfileRouter = Router();
  merchantProfileRouter.use(authMiddleware.validateToken);
  merchantProfileRouter.use(authMiddleware.restrictTo('merchant', 'admin'));
  merchantProfileRouter.get('/merchant/profile', getProfile);
  app.use('/', merchantProfileRouter);
  logger.info('Merchant get profile routes mounted');
};

/**
 * Main server startup function.
 */
async function startServer() {
  try {
    logger.info('Starting server initialization...');

    // Validate environment variables
    validateEnvironment(REQUIRED_ENV);

    // Initialize Sequelize connection
    await sequelize.authenticate();
    logger.info('Database connection established');

    // Load models explicitly
    const models = require('@models');
    logger.info('Models loaded', { models: Object.keys(models).filter(k => k !== 'sequelize' && k !== 'Sequelize') });

    // Setup Express app and HTTP server
    const app = await setupApp();
    const server = createServer(app);

    // Setup Socket.IO
    const io = await setupSocket(server);

    // Setup services after io is ready
    const { whatsappService, emailService, smsService } = setupCommonServices();
    const notificationService = setupNotificationService(io, whatsappService, emailService, smsService);

    // Attach services and models to app locals for global access
    app.locals.notificationService = notificationService;
    app.locals.authService = authService;
    app.locals.sequelize = sequelize;
    app.locals.models = models;

    // Setup routes after everything is ready
    setupAuthRoutes(app);
    setupMerchantProfile(app);
    setupGetProfile(app);
    setupNotificationRoutes(app);
    setupNotifications(app, notificationService);
    setupCustomerEvents(io, notificationService);

    // Start the server
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });

    // Setup error handlers
    setupErrorHandlers(server, io, sequelize);
  } catch (error) {
    logger.error('Server startup failed:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

Object.keys(require.cache).forEach((key) => delete require.cache[key]);
logger.info('Module cache cleared');

startServer();