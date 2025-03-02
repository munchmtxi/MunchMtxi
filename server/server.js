// server/server.js
require('module-alias/register');
require('dotenv').config();
const Express = require('express');
const Http = require('http');
const { sequelize } = require('@models');
const { logger } = require('@utils/logger');
const config = require('@config/config');
const { validateEnvironment } = require('@serverUtils/envValidation');
const { setupCustomerEvents } = require('@server/customer/events');
const { setupErrorHandlers } = require('@serverUtils/errorHandling');
const { setupCoreApp } = require('@setup/app/coreAppSetup');
const { setupMonitoring } = require('@setup/app/monitoringSetup');
const { setupCommonServices } = require('@setup/services/commonServices');
const { setupNotificationService } = require('@setup/services/notificationServices');
const { setupCoreSocket } = require('@setup/socket/coreSocketSetup');
const { setupSocketHandlers } = require('@setup/socket/socketHandlersSetup');
const { setupNotificationRoutes } = require('@setup/routes/notificationRoutesSetup');
const { setupNotifications } = require('@setup/notifications/notificationSetup');
const { shutdownServer } = require('@serverUtils/shutdown/serverShutdown');

const app = Express();
const server = Http.createServer(app);

const REQUIRED_ENV = ['PORT', 'DATABASE_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'];

let io;
let notificationService;

const startServer = async () => {
  try {
    logger.info('Starting server initialization...');

    logger.info('Validating environment variables...');
    validateEnvironment(REQUIRED_ENV);
    logger.info('Environment variables validated');

    logger.info('Authenticating database connection...');
    await sequelize.authenticate();
    logger.info('Database connection established successfully');

    logger.info('Setting up health monitoring...');
    const healthMonitor = setupMonitoring(app);
    logger.info('Health monitoring setup complete');

    logger.info('Setting up core application...');
    setupCoreApp(app, healthMonitor);
    logger.info('Core application setup complete');

    logger.info('Setting up Socket.IO...');
    io = setupCoreSocket(server);
    logger.info('Socket.IO setup complete');

    logger.info('Setting up common services...');
    const { whatsappService, emailService, smsService } = setupCommonServices();
    logger.info('Common services setup complete', {
      whatsappType: typeof whatsappService,
      emailType: typeof emailService,
      smsType: typeof smsService
    });

    logger.info('Setting up notification service...');
    notificationService = setupNotificationService(io, whatsappService, emailService, smsService);
    logger.info('Notification service setup complete');

    app.locals.healthMonitor = healthMonitor;
    app.locals.notificationService = notificationService;

    logger.info('Setting up socket handlers...');
    setupSocketHandlers(io, notificationService);
    logger.info('Socket handlers setup complete');

    logger.info('Setting up notifications...');
    setupNotifications(app, notificationService);
    logger.info('Notifications setup complete');

    logger.info('Setting up notification routes...');
    setupNotificationRoutes(app);
    logger.info('Notification routes setup complete');

    logger.info('Setting up customer events...');
    setupCustomerEvents(io, notificationService);
    logger.info('Customer events setup complete');

    logger.info('Starting server...');
    server.listen(config.port, () => {
      logger.info(`Server started on port ${config.port} in ${config.nodeEnv} mode`);
    });

    logger.info('Setting up error handlers...');
    setupErrorHandlers(server, io, sequelize);
    logger.info('Error handlers setup complete');
  } catch (error) {
    logger.error('Server startup failed:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();

module.exports = { app, server, io, notificationService };