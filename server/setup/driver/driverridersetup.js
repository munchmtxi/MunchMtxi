'use strict';

const driverRoutes = require('@routes/driver/driverRoutes');
const { logger } = require('@utils/logger');
const { Server } = require('socket.io');
const DriverService = require('@services/driver/driverService');
const Geolocation2Service = require('@services/geoLocation/Geolocation2Service');

/**
 * Sets up driver-related ride-hailing functionality for the MunchMtxi server.
 * @param {Object} app - Express application instance.
 * @param {Object} server - HTTP server instance (for WebSocket integration).
 */
const setupDriverRide = (app, server) => {
  logger.info('Setting up driver ride module');

  // Register driver routes under /api/v1/driver
  app.use('/api/v1/driver', driverRoutes);
  logger.info('Driver routes registered successfully at /api/v1/driver');

  // Initialize WebSocket for real-time driver updates
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  });

  // Namespace for driver-specific real-time communication
  const driverNamespace = io.of('/driver');

  driverNamespace.on('connection', (socket) => {
    logger.info('Driver connected via WebSocket', { socketId: socket.id });

    // Authenticate driver via token
    socket.on('authenticate', async (token) => {
      try {
        const decoded = require('jsonwebtoken').verify(token, process.env.JWT_ACCESS_SECRET);
        const driver = await DriverService.updateLocation(decoded.sub, { lat: 0, lng: 0 }); // Initial location
        socket.driverId = decoded.sub;
        socket.join(`driver:${driver.id}`);
        logger.info('Driver authenticated', { driverId: driver.id });
        socket.emit('authenticated', { status: 'success', driverId: driver.id });
      } catch (error) {
        logger.error('WebSocket authentication failed', { error: error.message });
        socket.emit('error', { message: 'Authentication failed' });
        socket.disconnect();
      }
    });

    // Handle location updates
    socket.on('updateLocation', async (location) => {
      if (!socket.driverId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      try {
        const driver = await DriverService.updateLocation(socket.driverId, location);
        driverNamespace.to(`driver:${socket.driverId}`).emit('locationUpdated', {
          driverId: socket.driverId,
          location: driver.current_location,
        });
        logger.debug('Driver location broadcast', { driverId: socket.driverId, location });
      } catch (error) {
        logger.error('Location update failed', { error: error.message });
        socket.emit('error', { message: 'Location update failed' });
      }
    });

    // Handle ride assignment notifications
    socket.on('rideAssigned', async (rideId) => {
      if (!socket.driverId) return;
      try {
        const ride = await DriverService.matchDriverToRide(rideId);
        driverNamespace.to(`driver:${socket.driverId}`).emit('rideAssigned', {
          rideId: ride.ride.id,
          pickup: ride.ride.pickupLocation,
          dropoff: ride.ride.dropoffLocation,
          route: ride.route,
        });
        logger.info('Ride assignment broadcast', { driverId: socket.driverId, rideId });
      } catch (error) {
        logger.error('Ride assignment broadcast failed', { error: error.message });
      }
    });

    socket.on('disconnect', () => {
      logger.info('Driver disconnected', { driverId: socket.driverId, socketId: socket.id });
    });
  });

  logger.info('Driver ride module fully initialized');
};

module.exports = setupDriverRide;