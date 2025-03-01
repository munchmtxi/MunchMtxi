// src/config/socket.js

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('@config/config');
const logger = require('@utils/logger');
const { User, Session } = require('@models');
const { EVENTS } = require('@config/events');
const staffHandlers = require('@handlers/staffHandlers');
const merchantHandlers = require('@handlers/merchantHandlers');
const driverHandlers = require('@handlers/driverHandlers');
const customerHandlers = require('@handlers/customerHandlers');
const adminHandlers = require('@handlers/adminHandlers');
const handlers = require('@handlers/roomHandlers');
const eventManager = require('@services/eventManager'); // New import

// Import roomManager from the services (replacing the old roomManagement)

const roomManager = require('@services/roomManager');

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

// (Optional) If needed locally, activeRooms can be maintained inside roomManager.
// Here, we assume roomManager manages its own state internally.

// Setup Socket.IO server
const setupSocket = (server) => {
  const io = socketIO(server, socketOptions);

  // Initialize the room manager with the io instance
  roomManager.initialize(io);

  // Rate limiting configuration
  const rateLimiter = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  };

  // Request counts for rate limiting
  const requestCounts = new Map();

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      const decoded = jwt.verify(token, config.jwt.secret);
      const [user, session] = await Promise.all([
        User.findByPk(decoded.id),
        Session.findOne({
          where: {
            userId: decoded.id,
            token: token,
            isActive: true
          }
        })
      ]);
      if (!user) {
        return next(new Error('User not found'));
      }
      if (!session) {
        return next(new Error('Invalid or expired session'));
      }
      socket.user = user;
      socket.sessionId = session.id;

      const clientIp = socket.handshake.address;
      const currentTime = Date.now();
      const userRequests = requestCounts.get(clientIp) || [];
      const recentRequests = userRequests.filter(
        time => currentTime - time < rateLimiter.windowMs
      );
      if (recentRequests.length >= rateLimiter.max) {
        return next(new Error('Rate limit exceeded'));
      }
      recentRequests.push(currentTime);
      requestCounts.set(clientIp, recentRequests);
      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication failed'));
    }
  });

  // New: Event Manager middleware for wrapping all incoming events
  io.use(async (socket, next) => {
    socket.use(async ([eventName, ...args], next) => {
      try {
        // Only handle events defined in our EVENTS constant
        if (Object.values(EVENTS).flat().includes(eventName)) {
          await eventManager.handleEvent(eventName, args[0], socket, io);
        }
        next();
      } catch (error) {
        logger.error('Event handling error:', error);
        next(error);
      }
    });
    next();
  });

  // Reconnection handling middleware
  io.use(async (socket, next) => {
    socket.on(EVENTS.RECONNECT_ATTEMPT, async () => {
      try {
        // getOfflineEvents should be defined elsewhere; this is a dummy implementation.
        const missedEvents = await getOfflineEvents(socket.user.id);
        if (missedEvents.length > 0) {
          socket.emit(EVENTS.SYNC_REQUEST, missedEvents);
        }
      } catch (error) {
        logger.error('Reconnection sync error:', error);
      }
    });
    next();
  });

  // Connection handling
  io.on(EVENTS.CONNECT, async (socket) => {
    try {
      await joinUserRooms(socket, io);
      setupRoleHandlers(socket, io);
      initializeRoomHandlers(socket, io); // Initialize room event handlers
      setupErrorHandling(socket);
      setupDisconnectHandling(socket); // Disconnect handling with room cleanup
      logger.info(`User connected: ${socket.user.id} (${socket.user.role})`, {
        userId: socket.user.id,
        role: socket.user.role,
        socketId: socket.id,
        sessionId: socket.sessionId
      });
    } catch (error) {
      logger.error('Error in socket connection:', error);
      socket.emit(EVENTS.ERROR, {
        message: 'Connection error',
        code: 'CONNECTION_ERROR'
      });
      socket.disconnect(true);
    }
  });

  // Clean up old rate limiting data periodically
  setInterval(() => {
    const currentTime = Date.now();
    for (const [ip, requests] of requestCounts.entries()) {
      const validRequests = requests.filter(
        time => currentTime - time < socketOptions.pingTimeout
      );
      if (validRequests.length === 0) {
        requestCounts.delete(ip);
      } else {
        requestCounts.set(ip, validRequests);
      }
    }
  }, 60000); // Clean up every minute

  return io;
};

// Helper function to join rooms
const joinUserRooms = async (socket, io) => {
  const { user } = socket;
  try {
    socket.join(`role:${user.role}`);
    socket.join(`user:${user.id}`);
    const accessibleRooms = await roomManager.getUserAccessibleRooms(user);
    for (const roomId of accessibleRooms) {
      await roomManager.joinRoom(socket, roomId);
    }
    switch (user.role.toUpperCase()) {
      case 'MERCHANT':
        await merchantHandlers.joinRooms(socket);
        break;
      case 'DRIVER':
        await driverHandlers.joinRooms(socket);
        break;
      case 'CUSTOMER':
        await customerHandlers.joinRooms(socket);
        break;
      case 'STAFF':
        await staffHandlers.joinRooms(socket);
        break;
      case 'ADMIN':
        socket.join('system:monitoring');
        break;
    }
    logger.info(`Rooms joined for user ${user.id}`, {
      userId: user.id,
      socketId: socket.id,
      rooms: Array.from(socket.rooms)
    });
  } catch (error) {
    logger.error('Error joining rooms:', error);
    throw error;
  }
};

// Helper function to setup role-specific handlers
const setupRoleHandlers = (socket, io) => {
  const { role } = socket.user;
  try {
    switch (role.toUpperCase()) {
      case 'CUSTOMER':
        customerHandlers.initialize(socket, io);
        break;
      case 'MERCHANT':
        merchantHandlers.initialize(socket, io);
        break;
      case 'DRIVER':
        driverHandlers.initialize(socket, io);
        break;
      case 'STAFF':
        staffHandlers.initialize(socket, io);
        break;
      case 'ADMIN':
        adminHandlers.initialize(socket, io);
        break;
      default:
        logger.warn(`Unknown role type: ${role}`);
    }
  } catch (error) {
    logger.error('Error setting up handlers:', error);
    throw error;
  }
};

// Setup error handling with additional event-specific error handling
const setupErrorHandling = (socket) => {
  socket.on('error', async (error) => {
    logger.error('Socket error:', error, {
      userId: socket.user?.id,
      socketId: socket.id
    });
    
    // Event-specific error handling via eventManager
    if (error.eventId) {
      const eventStatus = eventManager.getEventStatus(error.eventId);
      if (eventStatus) {
        logger.error('Event error details:', {
          eventId: error.eventId,
          eventStatus
        });
      }
    }
  });
  socket.use((packet, next) => {
    try {
      next();
    } catch (error) {
      logger.error('Uncaught socket error:', error);
      socket.emit(EVENTS.ERROR, {
        message: 'Internal server error',
        code: 'INTERNAL_ERROR'
      });
    }
  });
};

// Setup disconnect handling with room cleanup
const setupDisconnectHandling = (socket) => {
  socket.on(EVENTS.DISCONNECT, async () => {
    try {
      if (socket.user) {
        await User.update(
          { lastOnline: new Date() },
          { where: { id: socket.user.id } }
        );
      }
      switch (socket.user?.role.toUpperCase()) {
        case 'DRIVER':
          await updateDriverStatus(socket.user.id, 'OFFLINE');
          break;
        case 'MERCHANT':
          await updateMerchantAvailability(socket.user.id, false);
          break;
      }
      // Room cleanup: leave all rooms except the socket's own room
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
      logger.error('Error in disconnect handling:', error);
    }
  });
};

// Initialize room-specific event handlers with error handling
const initializeRoomHandlers = (socket, io) => {
  // Global error handling middleware for room events
  socket.use(async (packet, next) => {
    try {
      const [event] = packet;
      if (event.startsWith('room:') || event.startsWith('taxi:') || event.startsWith('table:')) {
        logger.info(`Room event received: ${event}`);
      }
      next();
    } catch (error) {
      logger.error('Room event error:', error);
      next(error);
    }
  });
  
  // Taxi room events
  socket.on(EVENTS.TAXI.REQUESTED, async (rideData) => {
    try {
      await handlers.handleTaxiRideRoom(socket, io, rideData);
    } catch (error) {
      socket.emit(EVENTS.ERROR, {
        message: 'Failed to setup taxi ride room',
        code: 'ROOM_SETUP_ERROR'
      });
    }
  });
  // Table room events
  socket.on(EVENTS.TABLE.BOOKED, async (tableData) => {
    try {
      await handlers.handleTableServiceRoom(socket, io, tableData);
    } catch (error) {
      socket.emit(EVENTS.ERROR, {
        message: 'Failed to setup table service room',
        code: 'ROOM_SETUP_ERROR'
      });
    }
  });
  // Quick link events
  socket.on(EVENTS.QUICK_LINK.ASSISTANCE_REQUESTED, async (requestData) => {
    try {
      await handlers.handleQuickLinkRequest(socket, io, requestData);
    } catch (error) {
      socket.emit(EVENTS.ERROR, {
        message: 'Failed to process quick link request',
        code: 'QUICK_LINK_ERROR'
      });
    }
  });
  // Service area events
  socket.on(EVENTS.TABLE_ROOM.AREA_UPDATED, async (areaData) => {
    try {
      await handlers.handleServiceAreaRoom(socket, io, areaData);
    } catch (error) {
      socket.emit(EVENTS.ERROR, {
        message: 'Failed to setup service area room',
        code: 'ROOM_SETUP_ERROR'
      });
    }
  });
  // Table group events
  socket.on(EVENTS.TABLE_ROOM.GROUP_CREATED, async (groupData) => {
    try {
      await handlers.handleTableGroupRoom(socket, io, groupData);
    } catch (error) {
      socket.emit(EVENTS.ERROR, {
        message: 'Failed to setup table group room',
        code: 'ROOM_SETUP_ERROR'
      });
    }
  });
};

// Dummy functions for updateDriverStatus and updateMerchantAvailability
// Replace these with your actual implementations.
const updateDriverStatus = async (driverId, status) => {
  // Implementation here...
};

const updateMerchantAvailability = async (merchantId, available) => {
  // Implementation here...
};

// Dummy function for getOfflineEvents; replace with actual logic as needed.
const getOfflineEvents = async (userId) => {
  // Implementation here...
  return [];
};

module.exports = { 
  setupSocket,
  roomManager 
};
