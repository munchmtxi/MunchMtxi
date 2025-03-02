// server/setup/notifications/socketNotification.js
const { logger } = require('@utils/logger');

module.exports = {
  setupSocketNotifications: (socket, io, notificationService) => {
    socket.on('sendCustomerNotification', async (data) => {
      try {
        const notification = await notificationService.sendCustomerNotification(data);
        socket.emit('notificationSent', notification);
        logger.info('Customer notification sent via socket', { userId: socket.user.id });
      } catch (error) {
        logger.error('Error sending customer notification via socket:', { error: error.message });
        socket.emit('error', { message: error.message, code: 'NOTIFICATION_ERROR' });
      }
    });

    socket.on('getUserNotifications', async ({ page, limit }) => {
      try {
        const notifications = await notificationService.getUserNotifications(socket.user.id, { page, limit });
        socket.emit('userNotifications', notifications);
        logger.info('User notifications fetched via socket', { userId: socket.user.id });
      } catch (error) {
        logger.error('Error fetching user notifications via socket:', { error: error.message });
        socket.emit('error', { message: error.message, code: 'FETCH_NOTIFICATIONS_ERROR' });
      }
    });

    logger.info('Socket notification handlers setup complete');
  }
};