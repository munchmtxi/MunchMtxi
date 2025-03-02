// server/setup/socket/socketHandlersSetup.js
const { logger } = require('@utils/logger');
const EventManager = require('@services/events/core/eventManager');

module.exports = {
  setupSocketHandlers: (io, notificationService) => {
    logger.info('Setting up Socket.IO handlers...');

    // Pass io to EventManager for broadcasting
    EventManager.setSocketIO(io);

    io.on('connection', (socket) => {
      logger.info('New Socket.IO connection', { socketId: socket.id });

      socket.on('disconnect', () => {
        logger.info('Socket.IO client disconnected', { socketId: socket.id });
      });
    });

    logger.info('Socket.IO handlers setup complete');
  }
};