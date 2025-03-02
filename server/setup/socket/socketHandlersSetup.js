// server/setup/socket/socketHandlersSetup.js
const { logger } = require('@utils/logger');
const { setupRoomHandlers } = require('./roomHandlersSetup');
const { setupSocketNotifications } = require('@setup/notifications/socketNotification');

module.exports = {
  setupSocketHandlers: (io, notificationService) => {
    io.on('connection', (socket) => {
      setupRoomHandlers(socket, io);
      setupSocketNotifications(socket, io, notificationService);

      socket.on('error', (error) => {
        logger.error('Socket error:', {
          error: error.message,
          userId: socket.user?.id,
          socketId: socket.id
        });
      });

      logger.info(`Socket connection established: ${socket.id}`, {
        userId: socket.user?.id,
        role: socket.user?.role
      });
    });

    logger.info('Socket.IO handlers setup complete');
  }
};