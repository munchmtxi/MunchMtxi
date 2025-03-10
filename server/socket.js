// server/socket.js
'use strict';
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('@config/config');
const { logger } = require('@utils/logger');
const { User, Session } = require('@models');
const { EVENTS } = require('@config/events');
const roomHandlers = require('@handlers/roomHandlers');
const roomManager = require('@services/rooms/core/roomManager');
const EventManager = require('@services/events/core/eventManager');

const socketOptions = {
  cors: { origin: config.frontendUrl, methods: ['GET', 'POST'], credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6
};

module.exports.setupSocket = (server) => {
  const io = new Server(server, socketOptions);
  EventManager.setSocketIO(io);

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
      if (!user || !session) return next(new Error('Invalid authentication'));
      socket.user = user;
      socket.sessionId = session.id;

      const clientIp = socket.handshake.address;
      const currentTime = Date.now();
      const userRequests = requestCounts.get(clientIp) || [];
      const recentRequests = userRequests.filter(time => currentTime - time < rateLimiter.windowMs);
      if (recentRequests.length >= rateLimiter.max) return next(new Error('Rate limit exceeded'));
      recentRequests.push(currentTime);
      requestCounts.set(clientIp, recentRequests);

      next();
    } catch (error) {
      logger.error('Socket auth failed:', error);
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    logger.info('New socket connection:', socket.id);

    // Inline room handlers (from roomHandlersSetup.js)
    socket.on(EVENTS.CONNECT, async () => {
      try {
        const { user } = socket;
        socket.join(`role:${user.role}`);
        socket.join(`user:${user.id}`);
        const accessibleRooms = await roomManager.getUserAccessibleRooms(user);
        for (const roomId of accessibleRooms) {
          await roomManager.joinRoom(socket, roomId);
        }
        if (user.role.toUpperCase() === 'ADMIN') socket.join('system:monitoring');
        logger.info(`Rooms joined for user ${user.id}`, { userId: user.id, socketId: socket.id, rooms: Array.from(socket.rooms) });
      } catch (error) {
        logger.error('Error joining rooms:', { error: error.message, userId: socket.user.id });
        socket.emit(EVENTS.ERROR, { message: 'Connection error', code: 'CONNECTION_ERROR' });
        socket.disconnect(true);
      }
    });

    socket.on(EVENTS.TAXI.REQUESTED, async (rideData) => {
      try {
        await roomHandlers.handleTaxiRideRoom(socket, io, rideData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on(EVENTS.TABLE.BOOKED, async (tableData) => {
      try {
        await roomHandlers.handleTableServiceRoom(socket, io, tableData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on(EVENTS.QUICK_LINK.ASSISTANCE_REQUESTED, async (requestData) => {
      try {
        await roomHandlers.handleQuickLinkRequest(socket, io, requestData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'QUICK_LINK_ERROR' });
      }
    });

    socket.on(EVENTS.TABLE_ROOM.AREA_UPDATED, async (areaData) => {
      try {
        await roomHandlers.handleServiceAreaRoom(socket, io, areaData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on(EVENTS.TABLE_ROOM.GROUP_CREATED, async (groupData) => {
      try {
        await roomHandlers.handleTableGroupRoom(socket, io, groupData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on('orderCreated', async (orderData) => {
      try {
        await roomHandlers.handleOrderCreation(socket, io, orderData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on('monitorSetup', async (monitoringData) => {
      try {
        await roomHandlers.handleAdminMonitoringRoom(socket, io, monitoringData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on(EVENTS.DISCONNECT, async () => {
      try {
        if (socket.user) {
          await require('@models').User.update({ lastOnline: new Date() }, { where: { id: socket.user.id } });
        }
        const userRooms = Array.from(socket.rooms);
        for (const roomId of userRooms) {
          if (roomId !== socket.id) await roomManager.leaveRoom(socket, roomId);
        }
        logger.info(`User disconnected: ${socket.user?.id}`, { userId: socket.user?.id, socketId: socket.id });
      } catch (error) {
        logger.error('Error in disconnect handling:', { error: error.message });
      }
    });

    // Inline geolocation socket handlers (from geolocationSocketSetup.js)
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

    // Inline notification handlers (from socketNotification.js)
    socket.on('sendCustomerNotification', async (data) => {
      const notificationService = socket.app?.locals?.notificationService;
      if (!notificationService) {
        logger.error('Notification service not available', { socketId: socket.id });
        socket.emit('error', { message: 'Service unavailable', code: 'SERVICE_UNAVAILABLE' });
        return;
      }
      try {
        const notification = await notificationService.sendCustomerNotification(data);
        socket.emit('notificationSent', notification);
        io.to(`user:${data.userId}`).emit('notification', notification);
        logger.info('Customer notification sent', { userId: data.userId, socketId: socket.id });
      } catch (error) {
        logger.error('Error sending customer notification:', { error: error.message, socketId: socket.id });
        socket.emit('error', { message: error.message, code: 'NOTIFICATION_ERROR' });
      }
    });

    socket.on('getUserNotifications', async ({ page = 1, limit = 10 }) => {
      const notificationService = socket.app?.locals?.notificationService;
      if (!notificationService) {
        logger.error('Notification service not available', { socketId: socket.id });
        socket.emit('error', { message: 'Service unavailable', code: 'SERVICE_UNAVAILABLE' });
        return;
      }
      try {
        const notifications = await notificationService.getUserNotifications(socket.user.id, { page, limit });
        socket.emit('userNotifications', notifications);
        logger.info('User notifications retrieved', { userId: socket.user.id, socketId: socket.id });
      } catch (error) {
        logger.error('Error fetching user notifications:', { error: error.message, socketId: socket.id });
        socket.emit('error', { message: error.message, code: 'FETCH_NOTIFICATIONS_ERROR' });
      }
    });

    // Inline socket handlers (from socketHandlersSetup.js)
    io.on('connection', (socket) => {
      logger.debug('Socket handlers initialized', { socketId: socket.id });

      socket.on('message', async (messageData) => {
        try {
          const { event, payload } = messageData;
          if (!event || !payload) {
            logger.warn('Invalid message data', { socketId: socket.id, messageData });
            socket.emit('error', { message: 'Invalid message data', code: 'INVALID_MESSAGE' });
            return;
          }
          logger.debug('Message received', { event, socketId: socket.id });
          EventManager.emit(event, { io, socket, payload });
        } catch (error) {
          logger.error('Error handling message:', { error: error.message, socketId: socket.id });
          socket.emit('error', { message: 'Message processing failed', code: 'MESSAGE_ERROR' });
        }
      });

      socket.on('broadcast', async (data) => {
        const notificationService = socket.app?.locals?.notificationService;
        if (!notificationService) {
          logger.error('Notification service not available for broadcast', { socketId: socket.id });
          socket.emit('error', { message: 'Service unavailable', code: 'SERVICE_UNAVAILABLE' });
          return;
        }
        try {
          const { message, room } = data;
          if (!message || !room) {
            logger.warn('Invalid broadcast data', { socketId: socket.id, data });
            socket.emit('error', { message: 'Invalid broadcast data', code: 'INVALID_BROADCAST' });
            return;
          }
          io.to(room).emit('broadcast', { message, senderId: socket.user.id });
          await notificationService.logBroadcast({ message, room, senderId: socket.user.id });
          logger.info('Broadcast sent', { room, senderId: socket.user.id, socketId: socket.id });
        } catch (error) {
          logger.error('Error in broadcast:', { error: error.message, socketId: socket.id });
          socket.emit('error', { message: 'Broadcast failed', code: 'BROADCAST_ERROR' });
        }
      });
    });

    // Payment handlers (from socket.js)
    socket.on('subscribe:payment', (paymentId) => {
      if (!paymentId) return logger.warn('Invalid paymentId:', socket.id);
      socket.join(`payment:${paymentId}`);
      logger.info(`Socket ${socket.id} subscribed to payment:${paymentId}`);
    });
    socket.on('unsubscribe:payment', (paymentId) => {
      if (!paymentId) return logger.warn('Invalid paymentId:', socket.id);
      socket.leave(`payment:${paymentId}`);
      logger.info(`Socket ${socket.id} unsubscribed from payment:${paymentId}`);
    });

    socket.on('disconnect', async () => {
      if (socket.user) await User.update({ lastOnline: new Date() }, { where: { id: socket.user.id } });
      logger.info('Socket disconnected:', socket.id);
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