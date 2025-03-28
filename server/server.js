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
const setupBranchProfileSecurity = require('@setup/merchant/branch/branchProfileSecuritySetup');
const setupMerchantProducts = require('@setup/merchant/products/products');
const setupInventory = require('@setup/merchant/products/inventorySetup');
const setupReservationRoutes = require('@setup/merchant/reservation/reservationRoutesSetup');
const { setupStaffProfile } = require('@setup/staff/profile/staffProfileSetup');
const { setupDriverProfile } = require('@setup/driver/driverSetup');
const { setupProfileRoutes } = require('@setup/customer/profile/profileRouteSetup');
const setupBooking = require('@setup/customer/bookingSetup');
const setupRideRoutes = require('@setup/customer/rideSetup');
const setupCartRoutes = require('@setup/customer/cartSetup'); // New import for cart setup

const REQUIRED_ENV = [
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'GOOGLE_MAPS_API_KEY',
];
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;

const validateEnvironment = (requiredEnv) => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error(`🚨 Missing env vars: ${missing.join(', ')}`);
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  logger.info('✅ Env vars checked');
};

const shutdownServer = async (server, io, sequelize) => {
  logger.info('🛑 Starting graceful shutdown...');
  if (io) io.close(() => logger.info('🔌 Socket.IO closed'));
  return new Promise((resolve, reject) => {
    server.close(() => {
      logger.info('🌐 HTTP server stopped');
      if (sequelize) {
        sequelize
          .close()
          .then(() => {
            logger.info('💾 DB connection closed');
            resolve();
          })
          .catch((err) => reject(err));
      } else {
        resolve();
      }
    });
    setTimeout(() => {
      logger.error(`⏰ Forced shutdown after ${GRACEFUL_SHUTDOWN_TIMEOUT}ms`);
      process.exit(1);
    }, GRACEFUL_SHUTDOWN_TIMEOUT);
  });
};

const setupErrorHandlers = (server, io, sequelize) => {
  process.on('uncaughtException', (error) => {
    logger.error(`💥 Uncaught Exception: ${error.message}`);
    shutdownServer(server, io, sequelize).then(() => process.exit(1));
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(`❌ Unhandled Rejection: ${reason.message || reason}`, { stack: reason.stack });
    // Comment out shutdown for debugging
    // shutdownServer(server, io, sequelize).then(() => process.exit(1));
  });
  process.on('SIGTERM', () => {
    logger.info('👋 SIGTERM received, shutting down...');
    shutdownServer(server, io, sequelize).then(() => process.exit(0));
  });
  process.on('SIGINT', () => {
    logger.info('👋 SIGINT received, shutting down...');
    shutdownServer(server, io, sequelize).then(() => process.exit(0));
  });
  logger.info('🛡️ Error handlers ready');
};

const logRouterStack = (app, label) => {
  logger.debug(`🚦 Stack after ${label}: ${app._router.stack.length} layers`);
};

async function startServer() {
  try {
    logger.info('🚀 Booting server...');
    validateEnvironment(REQUIRED_ENV);
    await sequelize.authenticate();
    logger.info('💾 DB connected');

    const models = require('@models');
    logger.info(`📦 Loaded ${Object.keys(models).length - 2} models`);

    const express = require('express');
    const app = express();

    app.use(express.json());
    logger.info('📋 JSON parser active');

    // Setup core middleware (CORS, CSRF, etc.)
    await setupApp(app);
    logRouterStack(app, 'setupApp');

    // Create server and initialize Socket.IO
    const server = createServer(app);
    const io = await setupSocket(server);

    // Initialize services before route setups
    const { whatsappService, emailService, smsService } = setupCommonServices();
    const notificationService = setupNotificationService(io, whatsappService, emailService, smsService);

    // Attach services to app.locals
    app.locals.notificationService = notificationService;
    app.locals.authService = authService;
    app.locals.sequelize = sequelize;
    app.locals.models = models;

    // Mount all routes after middleware and services
    logger.info('🛤️ Mounting routes...');

    logger.info('🚗 Setting up customer ride routes...');
    setupRideRoutes(app);
    logRouterStack(app, 'setupRideRoutes');

    logger.info('👤 Setting up customer profile routes...');
    setupProfileRoutes(app);
    logRouterStack(app, 'setupProfileRoutes');

    logger.info('🍽️ Setting up customer booking routes...');
    setupBooking(app);
    logRouterStack(app, 'setupBooking');

    logger.info('🛒 Setting up customer cart routes...'); // New cart setup
    setupCartRoutes(app);
    logRouterStack(app, 'setupCartRoutes');

    logger.info('🔐 Setting up auth routes...');
    setupAuthRoutes(app);
    logRouterStack(app, 'setupAuthRoutes');

    logger.info('🎨 Setting up banner...');
    setupBanner(app);
    logRouterStack(app, 'setupBanner');

    logger.info('🔐 Setting up 2FA...');
    setupMerchant2FA(app);
    logRouterStack(app, 'setupMerchant2FA');

    logger.info('👀 Setting up previews...');
    setupPreviewRoutes(app);
    logRouterStack(app, 'setupPreviewRoutes');

    logger.info('📊 Adding analytics to public profile...');
    app.use('/api/v1/merchants/:merchantId/profile', trackAnalytics());
    logger.info('📈 Analytics added');

    logger.info('🛍️ Setting up merchant products...');
    setupMerchantProducts(app);
    logRouterStack(app, 'setupMerchantProducts');

    logger.info('📦 Setting up inventory...');
    setupInventory(app);
    logRouterStack(app, 'setupInventory');

    logger.info('👤 Setting up get profile...');
    setupGetProfile(app);
    logRouterStack(app, 'setupGetProfile');

    logger.info('🏪 Setting up merchant profile...');
    setupMerchantProfile(app);
    logRouterStack(app, 'setupMerchantProfile');

    logger.info('🏢 Setting up business type...');
    setupBusinessType(app);
    logRouterStack(app, 'setupBusinessType');

    logger.info('🖼️ Setting up merchant images...');
    setupMerchantImages(app);
    logRouterStack(app, 'setupMerchantImages');

    logger.info('🔑 Setting up merchant password...');
    setupMerchantPassword(app);
    logRouterStack(app, 'setupMerchantPassword');

    logger.info('📝 Setting up merchant draft...');
    setupMerchantDraft(app);
    logRouterStack(app, 'setupMerchantDraft');

    logger.info('📒 Setting up activity log...');
    setupActivityLog(app);
    logRouterStack(app, 'setupActivityLog');

    logger.info('🗺️ Setting up maps routes...');
    setupMapsRoutes(app);
    logRouterStack(app, 'setupMapsRoutes');

    logger.info('📉 Setting up performance metrics...');
    setupPerformanceMetrics(app);
    logRouterStack(app, 'setupPerformanceMetrics');

    logger.info('🌿 Setting up branch profile...');
    setupBranchProfile(app);
    logRouterStack(app, 'setupBranchProfile');

    logger.info('🔒 Setting up branch security...');
    setupBranchProfileSecurity(app);
    logRouterStack(app, 'setupBranchProfileSecurity');

    logger.info('🍽️ Setting up reservation routes...');
    setupReservationRoutes(app);
    logRouterStack(app, 'setupReservationRoutes');

    logger.info('👷 Setting up staff profile...');
    setupStaffProfile(app);
    logRouterStack(app, 'setupStaffProfile');

    logger.info('🔔 Setting up notification routes...');
    setupNotificationRoutes(app);
    logRouterStack(app, 'setupNotificationRoutes');

    logger.info('📣 Setting up notifications...');
    setupNotifications(app, notificationService);
    logRouterStack(app, 'setupNotifications');

    logger.info('🎉 Setting up customer events...');
    setupCustomerEvents(io, notificationService);
    logRouterStack(app, 'setupCustomerEvents');

    logger.info('📊 Setting up analytics routes...');
    setupAnalyticsRoutes(app);
    logRouterStack(app, 'setupAnalyticsRoutes');

    logger.info('🌐 Setting up public profile...');
    setupPublicProfile(app);
    logRouterStack(app, 'setupPublicProfile');

    logger.info('🚗 Setting up driver profile...');
    setupDriverProfile(app);
    logRouterStack(app, 'setupDriverProfile');

    // Curl bypass for CSRF
    app.use((req, res, next) => {
      if (req.headers['user-agent']?.includes('curl')) {
        logger.info('🌀 CSRF skipped for curl', { path: req.path });
        return next();
      }
      next();
    });

    // 404 handler
    app.use((req, res, next) => {
      logger.warn(`🚫 404: ${req.method} ${req.url}`);
      res.status(404).json({ status: 'fail', message: `Route ${req.url} not found` });
    });
    logRouterStack(app, 'catch-all');

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      logger.info(`🎉 Server live on port ${port}`);
    });

    setupErrorHandlers(server, io, sequelize);
  } catch (error) {
    logger.error(`💥 Startup crashed: ${error.message}`);
    process.exit(1);
  }
}

startServer();