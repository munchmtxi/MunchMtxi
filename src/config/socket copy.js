// config/socket.js
const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('./config');
const logger = require('../utils/logger');

const setupSocket = (server) => {
  const io = socketIO(server, {
    cors: {
      origin: '*', // Adjust according to your security requirements
      methods: ['GET', 'POST'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }
    jwt.verify(token, config.jwt.secret, (err, decoded) => {
      if (err) {
        return next(new Error('Authentication error'));
      }
      socket.user = decoded;
      next();
    });
  });

  io.on('connection', (socket) => {
    logger.info(`User connected: ${socket.user.id}`);

    // Define your event handlers here
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.user.id}`);
    });
  });
};

module.exports = { setupSocket };
