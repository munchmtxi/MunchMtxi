const SocketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('@config/config');
const { logger } = require('@utils/logger');
const { User, Session } = require('@models');
const { EVENTS } = require('@config/events');
const eventManager = require('@services/events/core/eventManager');
const { setupGeolocationSocket } = require('../socket/geolocationSocketSetup'); // Relative path from server/setup/socket/

const socketOptions = {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6
};

module.exports = {
  setupCoreSocket: (server) => {
    logger.info('File loaded: coreSocketSetup.js'); // Debug to confirm loading
    logger.info('Setting up Socket.IO...');
    const io = SocketIO(server, socketOptions);

    const rateLimiter = { windowMs: 15 * 60 * 1000, max: 100 };
    const requestCounts = new Map();

    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication token required'));

        const decoded = jwt.verify(token, config.jwt.secret);
        const [user, session] = await Promise.all([
          User.findByPk(decoded.id),
          Session.findOne({ where: { userId: decoded.id, token, isActive: true } })
        ]);

        if (!user) return next(new Error('User not found'));
        if (!session) return next(new Error('Invalid or expired session'));

        socket.user = user;
        socket.sessionId = session.id;

        const clientIp = socket.handshake.address;
        const currentTime = Date.now();
        const userRequests = requestCounts.get(clientIp) || [];
        const recentRequests = userRequests.filter((time) => currentTime - time < rateLimiter.windowMs);
        if (recentRequests.length >= rateLimiter.max) return next(new Error('Rate limit exceeded'));

        recentRequests.push(currentTime);
        requestCounts.set(clientIp, recentRequests);
        next();
      } catch (error) {
        logger.error('Socket authentication error:', { error: error.message });
        next(new Error('Authentication failed'));
      }
    });

    io.use((socket, next) => {
      socket.use(async ([eventName, ...args], next) => {
        try {
          if (Object.values(EVENTS).flat().includes(eventName)) {
            const eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            await eventManager.handleEvent(eventId, eventName, args[0], socket, io);
          }
          next();
        } catch (error) {
          logger.error('Event handling error:', { error: error.message, eventName });
          next(error);
        }
      });
      next();
    });

    // Add geolocation socket handlers
    logger.info('Setting up geolocation socket handlers...');
    setupGeolocationSocket(io);
    logger.info('Geolocation socket handlers setup');

    setInterval(() => {
      const currentTime = Date.now();
      for (const [ip, requests] of requestCounts.entries()) {
        const validRequests = requests.filter((time) => currentTime - time < rateLimiter.windowMs);
        if (validRequests.length === 0) requestCounts.delete(ip);
        else requestCounts.set(ip, validRequests);
      }
    }, 60000);

    logger.info('Socket.IO setup complete');
    return io;
  }
};