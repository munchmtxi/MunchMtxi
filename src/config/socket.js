const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('@config/config');
const { logger } = require('@utils/logger');
const { User, Session } = require('@models');
const { EVENTS } = require('@config/events');
const eventManager = require('@services/events/core/eventManager');
const roomManager = require('@services/rooms/core/roomManager');
const roomHandlers = require('@services/rooms/handlers/roomHandlers'); // Adjusted path for clarity

// Socket connection options
const socketOptions = {
  cors: {
    origin: config.frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 1e6 // 1MB
};

/**
 * Sets up the Socket.IO server with authentication, event handling, and room management.
 * @param {http.Server} server - The HTTP server instance.
 * @returns {SocketIO.Server} - The configured Socket.IO instance.
 */
const setupSocket = (server) => {
  const io = socketIO(server, socketOptions);

  // Initialize room manager with io instance
  roomManager.initialize(io);

  // Rate limiting configuration
  const rateLimiter = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // Max requests per IP
  };
  const requestCounts = new Map();

  // Authentication middleware
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
      const recentRequests = userRequests.filter(
        (time) => currentTime - time < rateLimiter.windowMs
      );
      if (recentRequests.length >= rateLimiter.max) return next(new Error('Rate limit exceeded'));

      recentRequests.push(currentTime);
      requestCounts.set(clientIp, recentRequests);
      next();
    } catch (error) {
      logger.error('Socket authentication error:', { error: error.message });
      next(new Error('Authentication failed'));
    }
  });

  // Event manager middleware
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

  // Connection handling
  io.on(EVENTS.CONNECT, async (socket) => {
    try {
      await joinUserRooms(socket, io);
      setupRoomHandlers(socket, io);
      setupErrorHandling(socket);
      setupDisconnectHandling(socket);

      logger.info(`User connected: ${socket.user.id} (${socket.user.role})`, {
        userId: socket.user.id,
        role: socket.user.role,
        socketId: socket.id,
        sessionId: socket.sessionId
      });
    } catch (error) {
      logger.error('Error in socket connection:', { error: error.message });
      socket.emit(EVENTS.ERROR, { message: 'Connection error', code: 'CONNECTION_ERROR' });
      socket.disconnect(true);
    }
  });

  // Periodic cleanup of rate limiting data
  setInterval(() => {
    const currentTime = Date.now();
    for (const [ip, requests] of requestCounts.entries()) {
      const validRequests = requests.filter((time) => currentTime - time < rateLimiter.windowMs);
      if (validRequests.length === 0) requestCounts.delete(ip);
      else requestCounts.set(ip, validRequests);
    }
  }, 60000);

  return io;
};

/**
 * Joins the user to their role-specific and accessible rooms.
 * @param {Socket} socket - The Socket.IO socket instance.
 * @param {SocketIO.Server} io - The Socket.IO server instance.
 */
const joinUserRooms = async (socket, io) => {
  const { user } = socket;
  try {
    socket.join(`role:${user.role}`);
    socket.join(`user:${user.id}`);
    const accessibleRooms = await roomManager.getUserAccessibleRooms(user);
    for (const roomId of accessibleRooms) {
      await roomManager.joinRoom(socket, roomId);
    }

    if (user.role.toUpperCase() === 'ADMIN') {
      socket.join('system:monitoring');
    }

    logger.info(`Rooms joined for user ${user.id}`, {
      userId: user.id,
      socketId: socket.id,
      rooms: Array.from(socket.rooms)
    });
  } catch (error) {
    logger.error('Error joining rooms:', { error: error.message, userId: user.id });
    throw error;
  }
};

/**
 * Sets up room-specific event handlers.
 * @param {Socket} socket - The Socket.IO socket instance.
 * @param {SocketIO.Server} io - The Socket.IO server instance.
 */
const setupRoomHandlers = (socket, io) => {
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
};

/**
 * Sets up error handling for the socket.
 * @param {Socket} socket - The Socket.IO socket instance.
 */
const setupErrorHandling = (socket) => {
  socket.on('error', (error) => {
    logger.error('Socket error:', {
      error: error.message,
      userId: socket.user?.id,
      socketId: socket.id
    });
  });

  socket.use((packet, next) => {
    try {
      next();
    } catch (error) {
      logger.error('Uncaught socket error:', { error: error.message });
      socket.emit(EVENTS.ERROR, { message: 'Internal server error', code: 'INTERNAL_ERROR' });
    }
  });
};

/**
 * Sets up disconnect handling with room cleanup.
 * @param {Socket} socket - The Socket.IO socket instance.
 */
const setupDisconnectHandling = (socket) => {
  socket.on(EVENTS.DISCONNECT, async () => {
    try {
      if (socket.user) {
        await User.update({ lastOnline: new Date() }, { where: { id: socket.user.id } });
      }

      const userRooms = Array.from(socket.rooms);
      for (const roomId of userRooms) {
        if (roomId !== socket.id) {
          await roomManager.leaveRoom(socket, roomId);
        }
      }

      logger.info(`User disconnected: ${socket.user?.id}`, {
        userId: socket.user?.id,
        socketId: socket.id,
        sessionId: socket.sessionId
      });
    } catch (error) {
      logger.error('Error in disconnect handling:', { error: error.message });
    }
  });
};

// Export both setupSocket and roomManager explicitly
module.exports = {
  setupSocket,
  roomManager
};