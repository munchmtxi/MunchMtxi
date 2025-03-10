// server/server.js
'use strict';
require('module-alias/register');
require('dotenv').config();
const { createServer } = require('http');
const { Router } = require('express');
const { sequelize } = require('@models');
const { logger } = require('@utils/logger');
const { setupApp } = require('./app');
const { setupSocket } = require('./socket');
const { setupCommonServices } = require('@setup/services/commonServices');
const { setupNotificationService } = require('@setup/services/notificationServices');
const { setupAuthServices } = require('@setup/services/authServices');
const { setupMerchantProfile } = require('./setup/merchant/profile/profileSetup');
const { getProfile } = require('../src/controllers/merchant/profile/getProfile');
const authMiddleware = require('../src/middleware/authMiddleware'); // Correct import
const { setupNotificationRoutes } = require('@setup/routes/notificationRoutesSetup');
const { setupNotifications } = require('@setup/notifications/notificationSetup');
const { setupAuthRoutes } = require('@setup/routes/authRouteSetup');
const { setupCustomerEvents } = require('@setup/customer/events');

const REQUIRED_ENV = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;

// Environment Validation
const validateEnvironment = (requiredEnv) => {
  const missing = requiredEnv.filter(key => !process.env[key]);
  if (missing.length > 0) {
    logger.error('Missing required environment variables:', { missing });
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  logger.info('Environment variables validated successfully');
};

// Graceful Shutdown
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

// Error Handlers
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

// Updated setupGetProfile with correct middleware names
const setupGetProfile = (app) => {
  const merchantProfileRouter = Router();
  merchantProfileRouter.use(authMiddleware.validateToken); // Changed from verifyToken
  merchantProfileRouter.use(authMiddleware.restrictTo('merchant', 'admin')); // Changed from checkRole
  merchantProfileRouter.get('/merchant/profile', getProfile);
  app.use('/', merchantProfileRouter);
  logger.info('Merchant get profile routes mounted');
};

// Main Server Startup
async function startServer() {
  try {
    logger.info('Starting server initialization...');

    validateEnvironment(REQUIRED_ENV);
    await sequelize.authenticate();
    logger.info('Database connection established');

    const app = await setupApp();
    const server = createServer(app);

    const io = setupSocket(server);
    const { whatsappService, emailService, smsService } = setupCommonServices();
    const authService = setupAuthServices();
    const notificationService = setupNotificationService(io, whatsappService, emailService, smsService);

    app.locals.notificationService = notificationService;
    app.locals.authService = authService;

    setupAuthRoutes(app);
    setupMerchantProfile(app);
    setupGetProfile(app);
    setupNotificationRoutes(app);
    setupNotifications(app, notificationService);
    setupCustomerEvents(io, notificationService);

    const port = process.env.PORT || 3000;
    server.listen(port, () => logger.info(`Server running on port ${port}`));

    setupErrorHandlers(server, io, sequelize);
  } catch (error) {
    logger.error('Server startup failed:', error);
    process.exit(1);
  }
}

startServer();