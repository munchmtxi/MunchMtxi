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

// Setup Socket.IO server
const setupSocket = (server) => {
  const io = socketIO(server, socketOptions);

  // Rate limiting configuration
  const rateLimiter = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  };

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Find user and active session
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

      // Attach user and session to socket
      socket.user = user;
      socket.sessionId = session.id;

      // Rate limiting check
      const clientIp = socket.handshake.address;
      const currentTime = Date.now();
      const userRequests = requestCounts.get(clientIp) || [];
      
      // Clean up old requests
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

  // Connection handling
  io.on(EVENTS.CONNECT, async (socket) => {
    try {
      // Join appropriate rooms based on user role
      await joinUserRooms(socket, io);

      // Initialize role-specific handlers
      setupRoleHandlers(socket, io);

      // Setup error handling
      setupErrorHandling(socket);

      // Setup disconnect handling
      setupDisconnectHandling(socket);

      // Log connection
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

  return io;
};

// Helper function to join rooms
const joinUserRooms = async (socket, io) => {
  const { user } = socket;
  
  try {
    // Join role-specific room
    socket.join(`role:${user.role}`);
    
    // Join user-specific room
    socket.join(`user:${user.id}`);
    
    // Join additional rooms based on role
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
        // Admins join system monitoring room
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

// Setup error handling
const setupErrorHandling = (socket) => {
  socket.on('error', (error) => {
    logger.error('Socket error:', error, {
      userId: socket.user?.id,
      socketId: socket.id
    });
  });

  // Handle uncaught errors
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

// Setup disconnect handling
const setupDisconnectHandling = (socket) => {
  socket.on(EVENTS.DISCONNECT, async () => {
    try {
      // Update user's online status if needed
      if (socket.user) {
        await User.update(
          { lastOnline: new Date() },
          { where: { id: socket.user.id } }
        );
      }

      // Clean up any role-specific resources
      switch (socket.user?.role.toUpperCase()) {
        case 'DRIVER':
          await updateDriverStatus(socket.user.id, 'OFFLINE');
          break;
        case 'MERCHANT':
          await updateMerchantAvailability(socket.user.id, false);
          break;
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

// Request counting for rate limiting
const requestCounts = new Map();

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

module.exports = { setupSocket };