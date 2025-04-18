'use strict';

require('module-alias/register');
require('dotenv').config();
const { createServer } = require('http');
const express = require('express');
const { sequelize } = require('@models');
const { logger } = require('@utils/logger');
const { setupSocket } = require('@server/socket');
const { errorHandler, forceJsonMiddleware } = require('@middleware/errorHandler');

// Import all setup modules (kept as in your original)
const { setupApp } = require('@server/app');
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
const setupStaffAvailability = require('@setup/staff/availabilitySetup');
const setupPerformanceIncentive = require('@setup/staff/performanceIncentiveSetup');
const setupStaffDriverCoordination = require('@setup/staff/staffDriverCoordinationSetup');
const setupStaffCustomer = require('@setup/staff/staffCustomerSetup');
const { setupDriverProfile } = require('@setup/driver/driverSetup');
const setupDriverAvailability = require('@setup/driver/driverAvailabilitySetup');
const setupDriverOrder = require('@setup/driver/driverOrderSetup');
const setupDriverRide = require('@setup/driver/driverridersetup');
const setupDriverPayment = require('@setup/driver/driverPaymentSetup');
const { setupProfileRoutes } = require('@setup/customer/profile/profileRouteSetup');
const setupBooking = require('@setup/customer/bookingSetup');
const setupRideRoutes = require('@setup/customer/rideSetup');
const setupCartRoutes = require('@setup/customer/cartSetup');
const setupMenuRoutes = require('@setup/customer/menuSetup');
const setupOrder = require('@setup/customer/orderSetup');
const setupSubscriptions = require('@setup/customer/subscriptionSetup');
const { setupInDiningOrder } = require('@setup/customer/inDiningOrderSetup');
const setupFriendSetup = require('@setup/customer/friendSetup');
const { setupQuickLinkRoutes } = require('@setup/customer/quickLinkSetup');
const setupFeedback = require('@setup/customer/feedbackSetup');
const staffRoutes = require('@routes/staff/staffRoutes');
const setupStaffOperations = require('@setup/merchant/staffOperationsSetup');
const setupMerchantCustomer = require('@setup/merchant/merchantCustomerSetup');

const REQUIRED_ENV = [
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_EXPIRES_IN',
  'GOOGLE_MAPS_API_KEY',
];
const GRACEFUL_SHUTDOWN_TIMEOUT = 10000;

// Validate environment variables
const validateEnvironment = (requiredEnv) => {
  const missing = requiredEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    logger.error(`🚨 Missing env vars: ${missing.join(', ')}`);
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
  logger.info('✅ Env vars checked');
};

// Graceful shutdown
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

// Error handlers
const setupErrorHandlers = (server, io, sequelize) => {
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
    shutdownServer(server, io, sequelize).then(() => process.exit(1));
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled Rejection', { reason: reason.message || reason, stack: reason.stack });
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

// Additional Error Middleware to catch unhandled errors
// This middleware logs the error details and responds with a structured error message.
const additionalErrorMiddleware = (err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  res.status(err.statusCode || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
    errorCode: err.errorCode || 'SERVER_ERROR',
  });
};

// Global process error handlers (in case they are not captured elsewhere)
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', { reason: reason.message || reason, stack: reason.stack });
});

// Router stack logging
const logRouterStack = (app, label) => {
  logger.debug(`🚦 Stack after ${label}: ${app._router.stack.length} layers`);
};

// Main server startup
async function startServer() {
  try {
    logger.info('🚀 Booting server...');
    validateEnvironment(REQUIRED_ENV);

    // Database connection
    await sequelize.authenticate();
    logger.info('💾 DB connected');

    const models = require('@models');
    logger.info(`📦 Loaded ${Object.keys(models).length - 2} models`);

    // Express app setup
    const app = express();
    app.use(express.json());
    logger.info('📋 JSON parser active');

    await setupApp(app);
    logRouterStack(app, 'setupApp');

    // Single HTTP server and Socket.IO instance
    const server = createServer(app);
    const io = await setupSocket(server); // Centralized Socket.IO
    app.locals.io = io;

    // Common services and notification setup
    const { whatsappService, emailService, smsService } = setupCommonServices();
    const notificationService = setupNotificationService(io, whatsappService, emailService, smsService);
    app.locals.notificationService = notificationService;
    app.locals.authService = authService;
    app.locals.sequelize = sequelize;
    app.locals.models = models;

    logger.info('🛤️ Mounting routes...');

    // Customer Routes
    logger.info('🚗 Setting up customer ride routes...');
    setupRideRoutes(app);
    logRouterStack(app, 'setupRideRoutes');

    logger.info('👤 Setting up customer profile routes...');
    setupProfileRoutes(app);
    logRouterStack(app, 'setupProfileRoutes');

    logger.info('🍽️ Setting up customer booking routes...');
    setupBooking(app);
    logRouterStack(app, 'setupBooking');

    logger.info('🛒 Setting up customer cart routes...');
    setupCartRoutes(app);
    logRouterStack(app, 'setupCartRoutes');

    logger.info('🍔 Setting up customer menu routes...');
    setupMenuRoutes(app);
    logRouterStack(app, 'setupMenuRoutes');

    logger.info('📦 Setting up customer order routes...');
    setupOrder(app);
    logRouterStack(app, 'setupOrder');

    logger.info('🍽️ Setting up in-dining order routes...');
    logger.debug('Resolved path for setupInDiningOrder:', require.resolve('@setup/customer/inDiningOrderSetup'));
    const setupInDiningOrder = require('@setup/customer/inDiningOrderSetup');
    logger.debug('Imported setupInDiningOrder:', setupInDiningOrder);
    if (typeof setupInDiningOrder !== 'function') {
      logger.error('setupInDiningOrder is not a function:', setupInDiningOrder);
      throw new Error('setupInDiningOrder import failed');
    }
    setupInDiningOrder(app, io);
    logRouterStack(app, 'setupInDiningOrder');
    logger.info('In-dining order routes set up successfully');

    logger.info('📋 Setting up customer subscription routes...');
    setupSubscriptions(app);
    logRouterStack(app, 'setupSubscriptions');

    logger.info('👥 Setting up friend routes...');
    setupFriendSetup(app, io);
    logRouterStack(app, 'setupFriendSetup');

    logger.info('🔗 Setting up customer quick link routes...');
    setupQuickLinkRoutes(app);
    logRouterStack(app, 'setupQuickLinkRoutes');

    logger.info('🌟 Setting up customer feedback routes...');
    setupFeedback(app, io);
    logRouterStack(app, 'setupFeedback');

    // Auth and Merchant Routes
    logger.info('🔐 Setting up auth routes...');
    setupAuthRoutes(app);
    logRouterStack(app, 'setupAuthRoutes');

    logger.info('👥 Setting up merchant customer operations...');
    setupMerchantCustomer(app, io);
    logRouterStack(app, 'setupMerchantCustomer');

    logger.info('👷 Setting up merchant staff operations routes...');
    setupStaffOperations(app, io);
    logRouterStack(app, 'setupStaffOperations');

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
    logRouterStack(app, 'trackAnalytics');

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

    // Staff Routes
    logger.info('👷 Setting up staff profile...');
    setupStaffProfile(app);
    logRouterStack(app, 'setupStaffProfile');

    logger.info('👷 Setting up staff availability routes...');
    setupStaffAvailability(app);
    logRouterStack(app, 'setupStaffAvailability');

    logger.info('🏆 Setting up staff performance incentive routes...');
    setupPerformanceIncentive(app, io);
    logRouterStack(app, 'setupPerformanceIncentive');

    logger.info('🚚 Setting up staff driver coordination routes...');
    setupStaffDriverCoordination(app);
    logRouterStack(app, 'setupStaffDriverCoordination');

    logger.info('🛠️ Setting up staff customer service routes...');
    setupStaffCustomer(app, io, whatsappService, emailService, smsService);
    logRouterStack(app, 'setupStaffCustomer');

    logger.info('👷 Setting up staff management routes...');
    app.use('/api/staff', staffRoutes);
    logRouterStack(app, 'staffRoutes');

    // Driver Routes
    logger.info('🚗 Setting up driver profile...');
    setupDriverProfile(app);
    logRouterStack(app, 'setupDriverProfile');

    logger.info('⏰ Setting up driver availability...');
    setupDriverAvailability(app);
    logRouterStack(app, 'setupDriverAvailability');

    logger.info('🚚 Setting up driver order routes...');
    setupDriverOrder(app);
    logRouterStack(app, 'setupDriverOrder');

    logger.info('🚗 Setting up driver ride routes...');
    setupDriverRide(app, io);
    logRouterStack(app, 'setupDriverRide');

    logger.info('💰 Setting up driver payment routes...');
    setupDriverPayment(app);
    logRouterStack(app, 'setupDriverPayment');

    // Notification and Analytics Routes
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

    // Catch-all middleware
    app.use((req, res, next) => {
      if (req.headers['user-agent']?.includes('curl')) {
        logger.info('🌀 CSRF skipped for curl', { path: req.path });
        return next();
      }
      next();
    });

    app.use((req, res) => {
      logger.warn(`🚫 404: ${req.method} ${req.url}`);
      res.status(404).json({ status: 'fail', message: `Route ${req.url} not found` });
    });
    logRouterStack(app, 'catch-all');

    // Add error handling after all routes
    app.use(forceJsonMiddleware);
    logger.info('Force JSON Content-Type middleware applied');
    app.use(errorHandler);
    logger.info('Error handler middleware applied');

    // Additional error middleware to catch any unhandled errors
    app.use(additionalErrorMiddleware);

    logger.info('Final middleware stack:', app._router.stack.map(layer => layer.name || 'anonymous'));

    // Enhanced Server Logging for WebSocket and HTTP errors
    server.on('upgrade', (req, socket, head) => {
      logger.info('WebSocket upgrade request received:', { url: req.url, headers: req.headers });
      socket.on('error', (err) => logger.error('WebSocket socket error:', err));
    });

    server.on('error', (err) => {
      logger.error('HTTP server error:', err);
    });

    // Start server
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
