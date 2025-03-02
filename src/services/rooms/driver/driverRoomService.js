const roomManager = require('../core/roomManager');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { EVENTS } = require('@config/events');

class DriverRoomService {
  /**
   * Creates a delivery zone room for drivers.
   * @param {Socket} socket - The socket instance.
   * @param {string} zoneId - The zone ID.
   * @param {string[]} merchantIds - Array of merchant IDs associated with the zone.
   * @returns {Promise<string>} - The room ID.
   */
  async createDeliveryZoneRoom(socket, zoneId, merchantIds) {
    try {
      const roomData = {
        name: `zone-${zoneId}`,
        type: 'delivery-zone',
        permissions: {
          roles: ['DRIVER', 'MERCHANT'],
          customCheck: async (user) => {
            return merchantIds.includes(user.merchantId) || user.role === 'ADMIN';
          }
        }
      };

      const roomId = await roomManager.createRoom(socket, roomData);
      logger.info(`Delivery zone room created: ${roomId}`, {
        userId: socket.user.id,
        zoneId,
        merchantIds
      });

      return roomId;
    } catch (error) {
      logger.error('Failed to create delivery zone room:', {
        error: error.message,
        userId: socket.user.id,
        zoneId,
        merchantIds
      });
      throw new AppError('Failed to create delivery zone room', 500, 'ROOM_CREATION_FAILED', null, { zoneId, merchantIds });
    }
  }

  /**
   * Creates a taxi zone room for drivers.
   * @param {Socket} socket - The socket instance.
   * @param {object} zoneData - Data containing zoneId.
   * @returns {Promise<string>} - The room ID.
   */
  async createTaxiZoneRoom(socket, zoneData) {
    try {
      const { zoneId } = zoneData;
      if (!zoneId) {
        throw new AppError('Missing zone ID', 400, 'INVALID_ZONE_DATA');
      }

      const roomData = {
        name: `taxi-zone-${zoneId}`,
        type: 'taxi-zone',
        permissions: {
          roles: ['DRIVER', 'ADMIN'],
          customCheck: async (user) => {
            return user.authorizedZones?.includes(zoneId) || user.role === 'ADMIN';
          }
        }
      };

      const roomId = await roomManager.createRoom(socket, roomData);
      logger.info(`Taxi zone room created: ${roomId}`, {
        userId: socket.user.id,
        zoneId
      });

      return roomId;
    } catch (error) {
      logger.error('Failed to create taxi zone room:', {
        error: error.message,
        userId: socket.user.id,
        zoneData
      });
      throw new AppError('Failed to create taxi zone room', 500, 'ROOM_CREATION_FAILED', null, { zoneData });
    }
  }

  /**
   * Broadcasts an event to a delivery zone room.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   * @param {string} zoneId - The zone ID identifying the room.
   * @param {string} event - The event name to emit.
   * @param {object} data - The data to broadcast.
   */
  async broadcastToDeliveryZone(io, zoneId, event, data) {
    try {
      const roomId = `delivery-zone:zone-${zoneId}`;
      io.to(roomId).emit(event, data);
      logger.info(`Broadcast to delivery zone room: ${roomId}`, { event, data });
    } catch (error) {
      logger.error('Failed to broadcast to delivery zone room:', {
        error: error.message,
        roomId: `delivery-zone:zone-${zoneId}`,
        event
      });
      throw new AppError('Failed to broadcast to delivery zone room', 500, 'BROADCAST_FAILED', null, { zoneId, event });
    }
  }

  /**
   * Broadcasts an event to a taxi zone room.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   * @param {string} zoneId - The zone ID identifying the room.
   * @param {string} event - The event name to emit.
   * @param {object} data - The data to broadcast.
   */
  async broadcastToTaxiZone(io, zoneId, event, data) {
    try {
      const roomId = `taxi-zone:taxi-zone-${zoneId}`;
      io.to(roomId).emit(event, data);
      logger.info(`Broadcast to taxi zone room: ${roomId}`, { event, data });
    } catch (error) {
      logger.error('Failed to broadcast to taxi zone room:', {
        error: error.message,
        roomId: `taxi-zone:taxi-zone-${zoneId}`,
        event
      });
      throw new AppError('Failed to broadcast to taxi zone room', 500, 'BROADCAST_FAILED', null, { zoneId, event });
    }
  }
}

module.exports = new DriverRoomService();