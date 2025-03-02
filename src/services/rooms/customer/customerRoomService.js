const roomManager = require('../core/roomManager');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { EVENTS } = require('@config/events');

class CustomerRoomService {
  /**
   * Creates a table service room for customers.
   * @param {Socket} socket - The socket instance.
   * @param {string} tableId - The table ID.
   * @param {string} merchantId - The merchant ID.
   * @returns {Promise<string>} - The room ID.
   */
  async createTableServiceRoom(socket, tableId, merchantId) {
    try {
      const roomData = {
        name: `table-${tableId}`,
        type: 'table-service',
        permissions: {
          roles: ['MERCHANT', 'STAFF', 'CUSTOMER'],
          customCheck: async (user) => {
            return user.merchantId === merchantId || user.tableId === tableId || user.role === 'ADMIN';
          }
        }
      };

      const roomId = await roomManager.createRoom(socket, roomData);
      logger.info(`Table service room created: ${roomId}`, {
        userId: socket.user.id,
        tableId,
        merchantId
      });

      return roomId;
    } catch (error) {
      logger.error('Failed to create table service room:', {
        error: error.message,
        userId: socket.user.id,
        tableId,
        merchantId
      });
      throw new AppError('Failed to create table service room', 500, 'ROOM_CREATION_FAILED', null, { tableId, merchantId });
    }
  }

  /**
   * Creates a taxi ride room for customers.
   * @param {Socket} socket - The socket instance.
   * @param {object} rideData - Data containing rideId, customerId, and driverId.
   * @returns {Promise<string>} - The room ID.
   */
  async createTaxiRideRoom(socket, rideData) {
    try {
      const { rideId, customerId, driverId } = rideData;
      if (!rideId || !customerId || !driverId) {
        throw new AppError('Missing required ride data', 400, 'INVALID_RIDE_DATA');
      }

      const roomData = {
        name: `taxi-ride-${rideId}`,
        type: 'taxi-ride',
        permissions: {
          roles: ['DRIVER', 'CUSTOMER', 'ADMIN'],
          customCheck: async (user) => {
            return user.id === customerId || user.id === driverId || user.role === 'ADMIN';
          }
        }
      };

      const roomId = await roomManager.createRoom(socket, roomData);
      logger.info(`Taxi ride room created: ${roomId}`, {
        userId: socket.user.id,
        rideId,
        customerId,
        driverId
      });

      return roomId;
    } catch (error) {
      logger.error('Failed to create taxi ride room:', {
        error: error.message,
        userId: socket.user.id,
        rideData
      });
      throw new AppError('Failed to create taxi ride room', 500, 'ROOM_CREATION_FAILED', null, { rideData });
    }
  }

  /**
   * Broadcasts an event to a table service room.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   * @param {string} tableId - The table ID identifying the room.
   * @param {string} event - The event name to emit.
   * @param {object} data - The data to broadcast.
   */
  async broadcastToTable(io, tableId, event, data) {
    try {
      const roomId = `table-service:table-${tableId}`;
      io.to(roomId).emit(event, data);
      logger.info(`Broadcast to table room: ${roomId}`, { event, data });
    } catch (error) {
      logger.error('Failed to broadcast to table room:', {
        error: error.message,
        roomId: `table-service:table-${tableId}`,
        event
      });
      throw new AppError('Failed to broadcast to table room', 500, 'BROADCAST_FAILED', null, { tableId, event });
    }
  }

  /**
   * Broadcasts an event to a taxi ride room.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   * @param {string} rideId - The ride ID identifying the room.
   * @param {string} event - The event name to emit.
   * @param {object} data - The data to broadcast.
   */
  async broadcastToTaxiRide(io, rideId, event, data) {
    try {
      const roomId = `taxi-ride:taxi-ride-${rideId}`;
      io.to(roomId).emit(event, data);
      logger.info(`Broadcast to taxi ride room: ${roomId}`, { event, data });
    } catch (error) {
      logger.error('Failed to broadcast to taxi ride room:', {
        error: error.message,
        roomId: `taxi-ride:taxi-ride-${rideId}`,
        event
      });
      throw new AppError('Failed to broadcast to taxi ride room', 500, 'BROADCAST_FAILED', null, { rideId, event });
    }
  }
}

module.exports = new CustomerRoomService();