const SocketIO = require('socket.io');
const { setupGeolocationSocket } = require('./socket/geolocationSocketSetup');
const { logger } = require('@utils/logger');

logger.info('File loaded: socket.js');

module.exports = {
  setupSocket: (server) => {
    const io = SocketIO(server);
    io.on('connection', (socket) => {
      socket.on('subscribe:payment', async (paymentId) => {
        if (!paymentId) {
          logger.warn({ message: 'Payment subscription attempted with invalid paymentId', socketId: socket.id, timestamp: new Date().toISOString(), context: 'socketSubscription' });
          return;
        }
        socket.join(`payment:${paymentId}`);
        logger.info(`Socket ${socket.id} subscribed to payment:${paymentId}`);
      });
      socket.on('unsubscribe:payment', (paymentId) => {
        if (!paymentId) {
          logger.warn({ message: 'Payment unsubscription attempted with invalid paymentId', socketId: socket.id, timestamp: new Date().toISOString(), context: 'socketUnsubscription' });
          return;
        }
        socket.leave(`payment:${paymentId}`);
        logger.info(`Socket ${socket.id} unsubscribed from payment:${paymentId}`);
      });
    });
    logger.info('Setting up geolocation socket handlers...');
    setupGeolocationSocket(io);
    logger.info('Geolocation socket handlers setup');
    return io;
  }
};