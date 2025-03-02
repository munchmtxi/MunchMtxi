// server/setup/routes/notificationRoutesSetup.js
const NotificationRoutes = require('@routes/notificationRoutes');
const { logger } = require('@utils/logger');

module.exports = {
  setupNotificationRoutes: (app) => {
    app.use('/api/notifications', NotificationRoutes);
    logger.info('Notification routes mounted');
  }
};