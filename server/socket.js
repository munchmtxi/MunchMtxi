'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('@config/config');
const { logger } = require('@utils/logger');
const { User, Session, Staff } = require('@models');
const STAFF_EVENTS = require('@config/events/staff/profile/events');
const roomManager = require('@services/rooms/core/roomManager');
const EventManager = require('@services/events/core/eventManager');
const staffSocketSetup = require('@server/setup/staff/staffSocketSetup');

const socketOptions = {
  cors: { origin: config.frontendUrl || 'http://localhost:5173', methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket'], // Force WebSocket to match client
  maxHttpBufferSize: 1e6,
};

module.exports.setupSocket = (server) => {
  const io = new Server(server, socketOptions);
  EventManager.setSocketIO(io);

  const rateLimiter = { windowMs: 15 * 60 * 1000, max: 100 };
  const requestCounts = new Map();

  io.use(async (socket, next) => {
    try {
      logger.info('Socket connection attempt:', { socketId: socket.id, auth: socket.handshake.auth });
      const token = socket.handshake.auth.token;
      if (!token) {
        logger.warn('No authentication token provided', { socketId: socket.id });
        return next(new Error('Authentication token required'));
      }

      let decoded;
      try {
        decoded = jwt.verify(token, config.jwt.secret);
        logger.info('Token decoded:', { socketId: socket.id, decoded });
      } catch (jwtError) {
        logger.error('JWT verification failed:', { socketId: socket.id, error: jwtError.message });
        return next(new Error('Invalid token'));
      }

      const [user, session] = await Promise.all([
        User.findByPk(decoded.id, { include: [{ model: Staff, as: 'staff_profile' }] }),
        Session.findOne({ where: { userId: decoded.id, token, isActive: true } }),
      ]);

      if (!user) {
        logger.warn('User not found', { socketId: socket.id, userId: decoded.id });
        return next(new Error('User not found'));
      }
      if (!session) {
        logger.warn('Active session not found', { socketId: socket.id, userId: decoded.id });
        return next(new Error('Session not found or inactive'));
      }

      socket.user = user;
      socket.sessionId = session.id;

      const clientIp = socket.handshake.address;
      const currentTime = Date.now();
      const userRequests = requestCounts.get(clientIp) || [];
      const recentRequests = userRequests.filter(time => currentTime - time < rateLimiter.windowMs);
      if (recentRequests.length >= rateLimiter.max) {
        logger.warn('Rate limit exceeded', { clientIp, socketId: socket.id });
        return next(new Error('Rate limit exceeded'));
      }
      recentRequests.push(currentTime);
      requestCounts.set(clientIp, recentRequests);

      logger.info('Socket authenticated:', { socketId: socket.id, userId: user.id });
      next();
    } catch (error) {
      logger.error('Socket middleware error:', { socketId: socket.id, error: error.message });
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('New socket connection:', { socketId: socket.id, userId: socket.user.id });

    socket.on('connect', async () => {
      try {
        const { user } = socket;
        socket.join(`role:${user.role_id}`);
        socket.join(`user:${user.id}`);
        const accessibleRooms = await roomManager.getUserAccessibleRooms(user);
        for (const roomId of accessibleRooms) {
          await roomManager.joinRoom(socket, roomId);
        }
        if (user.role_id === 1) socket.join('system:monitoring');
        logger.info(`Rooms joined for user ${user.id}`, {
          userId: user.id,
          socketId: socket.id,
          rooms: Array.from(socket.rooms),
        });
      } catch (error) {
        logger.error('Error joining rooms:', { error: error.message, userId: socket.user.id });
        socket.emit(STAFF_EVENTS.STAFF.ERROR, { message: 'Connection error', code: 'CONNECTION_ERROR' });
        socket.disconnect(true);
      }
    });

    staffSocketSetup(io, socket);

    socket.on('subscribe:geolocation', (userId) => {
      if (!userId) {
        logger.warn('Invalid geolocation subscription', { socketId: socket.id });
        return;
      }
      socket.join(`geolocation:${userId}`);
      logger.info(`Subscribed to geolocation:${userId}`, { socketId: socket.id });
    });

    socket.on('geolocationUpdate', (data) => {
      if (!data.userId || !data.latitude || !data.longitude) {
        logger.warn('Invalid geolocation update', { socketId: socket.id, data });
        return;
      }
      io.to(`geolocation:${data.userId}`).emit('geolocationUpdate', data);
      logger.debug(`Geolocation update for user ${data.userId}`, { socketId: socket.id });
    });

    socket.on('unsubscribe:geolocation', (userId) => {
      if (!userId) {
        logger.warn('Invalid geolocation unsubscription', { socketId: socket.id });
        return;
      }
      socket.leave(`geolocation:${userId}`);
      logger.info(`Unsubscribed from geolocation:${userId}`, { socketId: socket.id });
    });

    socket.on('subscribe:payment', (paymentId) => {
      if (!paymentId) {
        logger.warn('Invalid payment subscription', { socketId: socket.id });
        return;
      }
      socket.join(`payment:${paymentId}`);
      logger.info(`Subscribed to payment:${paymentId}`, { socketId: socket.id });
    });

    socket.on('unsubscribe:payment', (paymentId) => {
      if (!paymentId) {
        logger.warn('Invalid payment unsubscription', { socketId: socket.id });
        return;
      }
      socket.leave(`payment:${paymentId}`);
      logger.info(`Unsubscribed from payment:${paymentId}`, { socketId: socket.id });
    });

    socket.on('message', async (messageData) => {
      try {
        const { event, payload } = messageData;
        if (!event || !payload) {
          logger.warn('Invalid message data', { socketId: socket.id, messageData });
          return socket.emit(STAFF_EVENTS.STAFF.ERROR, { message: 'Invalid message data', code: 'INVALID_MESSAGE' });
        }
        EventManager.emit(event, { io, socket, payload });
        logger.debug('Message processed', { event, socketId: socket.id });
      } catch (error) {
        logger.error('Error handling message:', { error: error.message, socketId: socket.id });
        socket.emit(STAFF_EVENTS.STAFF.ERROR, { message: 'Message processing failed', code: 'MESSAGE_ERROR' });
      }
    });

    socket.on('broadcast', async (data) => {
      try {
        const { message, room } = data;
        if (!message || !room) {
          logger.warn('Invalid broadcast data', { socketId: socket.id, data });
          return socket.emit(STAFF_EVENTS.STAFF.ERROR, { message: 'Invalid broadcast data', code: 'INVALID_BROADCAST' });
        }
        io.to(room).emit('broadcast', { message, senderId: socket.user.id });
        logger.info('Broadcast sent:', { room, senderId: socket.user.id, socketId: socket.id });
      } catch (error) {
        logger.error('Error in broadcast:', { error: error.message, socketId: socket.id });
        socket.emit(STAFF_EVENTS.STAFF.ERROR, { message: 'Broadcast failed', code: 'BROADCAST_ERROR' });
      }
    });

    socket.on('disconnect', async () => {
      try {
        if (socket.user) {
          await User.update({ last_login_at: new Date() }, { where: { id: socket.user.id } });
        }
        const userRooms = Array.from(socket.rooms);
        for (const roomId of userRooms) {
          if (roomId !== socket.id) await roomManager.leaveRoom(socket, roomId);
        }
        logger.info(`User disconnected: ${socket.user?.id}`, { userId: socket.user?.id, socketId: socket.id });
      } catch (error) {
        logger.error('Error in disconnect handling:', { error: error.message, socketId: socket.id });
      }
    });
  });

  setInterval(() => {
    const currentTime = Date.now();
    for (const [ip, requests] of requestCounts.entries()) {
      const validRequests = requests.filter(time => currentTime - time < rateLimiter.windowMs);
      if (validRequests.length === 0) requestCounts.delete(ip);
      else requestCounts.set(ip, validRequests);
    }
  }, 60000);

  logger.info('Socket.IO setup complete');
  return io;
};