const { logger } = require('@utils/logger');

module.exports = {
  setupGeolocationSocket: (io) => {
    io.on('connection', (socket) => {
      logger.info(`New socket connection for geolocation: ${socket.id}`);
      socket.on('subscribe:geolocation', (userId) => {
        if (!userId) {
          logger.warn(`Geolocation subscription failed: Invalid userId, socket: ${socket.id}`);
          return;
        }
        socket.join(`geolocation:${userId}`);
        logger.info(`Socket ${socket.id} subscribed to geolocation:${userId}`);
      });
      socket.on('geolocationUpdate', (data) => {
        if (!data.userId || !data.latitude || !data.longitude) {
          logger.warn(`Invalid geolocation update data from socket ${socket.id}`, { data });
          return;
        }
        io.to(`geolocation:${data.userId}`).emit('geolocationUpdate', data);
        logger.debug(`Geolocation update broadcasted for user ${data.userId}`, { data });
      });
      socket.on('unsubscribe:geolocation', (userId) => {
        if (!userId) {
          logger.warn(`Geolocation unsubscription failed: Invalid userId, socket: ${socket.id}`);
          return;
        }
        socket.leave(`geolocation:${userId}`);
        logger.info(`Socket ${socket.id} unsubscribed from geolocation:${userId}`);
      });
      socket.on('disconnect', () => {
        logger.info(`Socket disconnected: ${socket.id}`);
      });
    });
  }
};