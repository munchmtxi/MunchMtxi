// server.js
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
const authService = require('@services/common/authService');
const { setupMerchantProfile } = require('@setup/merchant/profile/profileSetup');
const { setupGetProfile } = require('@setup/merchant/profile/getProfileSetup');
const { setupBusinessType } = require('@setup/merchant/profile/businessTypeSetup');
const { setupMerchantImages } = require('@setup/merchant/profile/imageSetup');
const { setupMerchantPassword } = require('@setup/merchant/profile/passwordSetup');
const { setupMerchant2FA } = require('@setup/merchant/profile/merchant2FASetup');
const { setupPreviewRoutes } = require('@setup/merchant/profile/previewSetup');
const setupMerchantDraft = require('@setup/merchant/profile/draftSetup');
const setupActivityLog = require('@setup/merchant/profile/activityLogSetup');
const { setupNotificationRoutes } = require('@setup/routes/notificationRoutesSetup');
const { setupNotifications } = require('@setup/notifications/notificationSetup');
const { setupAuthRoutes } = require('@setup/routes/authRouteSetup');
const { setupCustomerEvents } = require('@setup/customer/events');
const { setupAnalyticsRoutes } = require('@setup/merchant/profile/analyticsSetup');
const { trackAnalytics } = require('@middleware/analyticsMiddleware');
const { setupPublicProfile } = require('@setup/merchant/profile/publicProfileSetup');
const setupBanner = require('@setup/merchant/profile/bannerSetup');
const setupMapsRoutes = require('@setup/merchant/profile/mapsSetup');
const setupPerformanceMetrics = require('@setup/merchant/profile/performanceMetricsSetup');
const { setupBranchProfile } = require('@setup/merchant/branch/profileSetup');
const setupBranchProfileSecurity = require('@setup/merchant/branch/branchProfileSecuritySetup'); // New import

const REQUIRED_ENV = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN', 'GOOGLE_MAPS_API_KEY'];
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;

const validateEnvironment = (requiredEnv) => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error('Missing required environment variables:', { missing });
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  logger.info('Environment variables validated successfully');
};

const shutdownServer = async (server, io, sequelize) => {
  logger.info('Initiating graceful server shutdown...');
  if (io) io.close(() => logger.info('Socket.IO server closed'));
  return new Promise((resolve, reject) => {
    server.close(() => {
      logger.info('HTTP server closed successfully');
      if (sequelize) {
        sequelize
          .close()
          .then(() => {
            logger.info('Database connection closed successfully');
            resolve();
          })
          .catch((err) => reject(err));
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

const setupErrorHandlers = (server, io, sequelize) => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', { error: error.message });
    shutdownServer(server, io, sequelize).then(() => process.exit(1));
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection:', { reason: reason.message || reason });
    shutdownServer(server, io, sequelize).then(() => process.exit(1));
  });
  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down...');
    shutdownServer(server, io, sequelize).then(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down...');
    shutdownServer(server, io, sequelize).then(() => process.exit(0));
  });
  logger.info('Error handlers setup complete');
};

const logRouterStack = (app, label) => {
  logger.info(`Router stack after ${label}:`, {
    routes: app._router.stack.map((layer) => ({
      path: layer.route?.path || layer.regexp?.toString(),
      methods: layer.route?.methods || {},
    })),
  });
};

async function startServer() {
  try {
    logger.info('Starting server initialization...');
    validateEnvironment(REQUIRED_ENV);
    await sequelize.authenticate();
    logger.info('Database connection established');

    const models = require('@models');
    logger.info('Models loaded', {
      models: Object.keys(models).filter((k) => k !== 'sequelize' && k !== 'Sequelize'),
    });

    const express = require('express');
    const app = express();

    app.use(express.json());
    logger.info('Early JSON body parser applied');

    // Mount banner routes BEFORE any global auth middleware
    logger.info('Calling setupBanner...');
    setupBanner(app);
    logRouterStack(app, 'setupBanner');

    // Now proceed with other middleware and setups
    logger.info('Calling setupMerchant2FA before setupApp...');
    setupMerchant2FA(app);
    logRouterStack(app, 'setupMerchant2FA');

    await setupApp(app);
    logRouterStack(app, 'setupApp');

    logger.info('Calling setupPreviewRoutes...');
    setupPreviewRoutes(app);
    logRouterStack(app, 'setupPreviewRoutes');

    logger.info('Applying analytics tracking to public profile...');
    app.use('/api/v1/merchants/:merchantId/profile', trackAnalytics());
    logger.info('Analytics middleware applied');

    app.use((req, res, next) => {
      if (req.headers['user-agent']?.includes('curl')) {
        logger.info('CSRF bypassed for curl request', { method: req.method, url: req.url });
        return next();
      }
      next();
    });

    const server = createServer(app);
    const io = await setupSocket(server);

    const { whatsappService, emailService, smsService } = setupCommonServices();
    const notificationService = setupNotificationService(io, whatsappService, emailService, smsService);

    app.locals.notificationService = notificationService;
    app.locals.authService = authService;
    app.locals.sequelize = sequelize;
    app.locals.models = models;

    logger.info('Setting up routes...');
    setupAuthRoutes(app);
    logRouterStack(app, 'setupAuthRoutes');

    logger.info('Calling setupGetProfile...');
    setupGetProfile(app);
    logRouterStack(app, 'setupGetProfile');

    logger.info('Calling setupMerchantProfile...');
    setupMerchantProfile(app);
    logRouterStack(app, 'setupMerchantProfile');

    logger.info('Calling setupBusinessType...');
    setupBusinessType(app);
    logRouterStack(app, 'setupBusinessType');

    logger.info('Calling setupMerchantImages...');
    setupMerchantImages(app);
    logRouterStack(app, 'setupMerchantImages');

    logger.info('Calling setupMerchantPassword...');
    setupMerchantPassword(app);
    logRouterStack(app, 'setupMerchantPassword');

    logger.info('Calling setupMerchantDraft...');
    setupMerchantDraft(app);
    logRouterStack(app, 'setupMerchantDraft');

    logger.info('Calling setupActivityLog...');
    setupActivityLog(app);
    logRouterStack(app, 'setupActivityLog');

    logger.info('Calling setupMapsRoutes...');
    setupMapsRoutes(app);
    logRouterStack(app, 'setupMapsRoutes');

    logger.info('Calling setupPerformanceMetrics...');
    setupPerformanceMetrics(app);
    logRouterStack(app, 'setupPerformanceMetrics');

    logger.info('Calling setupBranchProfile...');
    setupBranchProfile(app);
    logRouterStack(app, 'setupBranchProfile');

    logger.info('Calling setupBranchProfileSecurity...'); // New setup call
    setupBranchProfileSecurity(app);
    logRouterStack(app, 'setupBranchProfileSecurity');

    setupNotificationRoutes(app);
    logRouterStack(app, 'setupNotificationRoutes');

    setupNotifications(app, notificationService);
    logRouterStack(app, 'setupNotifications');

    setupCustomerEvents(io, notificationService);
    logRouterStack(app, 'setupCustomerEvents');

    logger.info('Calling setupAnalyticsRoutes...');
    setupAnalyticsRoutes(app);
    logRouterStack(app, 'setupAnalyticsRoutes');

    setupPublicProfile(app);
    logger.info('Public profile setup complete');

    logger.info('Full router stack after all setups', {
      stack: app._router.stack.map((layer) => ({
        path: layer.route?.path || layer.regexp?.toString(),
        methods: layer.route?.methods || {},
      })),
    });

    app.use((req, res, next) => {
      logger.warn('Unhandled route:', { method: req.method, url: req.url });
      res.status(404).json({ status: 'fail', message: `Route ${req.url} not found` });
    });
    logRouterStack(app, 'catch-all');

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      logger.info(`Server running on port ${port}`);
    });

    setupErrorHandlers(server, io, sequelize);
  } catch (error) {
    logger.error('Server startup failed:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

startServer();