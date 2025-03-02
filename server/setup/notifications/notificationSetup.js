// server/setup/notifications/notificationSetup.js
const NotificationRoutes = require('@routes/notificationRoutes');
const { logger } = require('@utils/logger');

module.exports = {
  setupNotifications: (app, notificationService) => {
    // Make notificationService available to controllers
    app.locals.notificationService = notificationService;

    // Mount notification routes
    app.use('/api/notifications', NotificationRoutes);

    logger.info('Notification routes and service setup complete');
  }
};