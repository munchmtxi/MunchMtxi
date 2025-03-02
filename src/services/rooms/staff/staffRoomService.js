const roomManager = require('../core/roomManager');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { EVENTS } = require('@config/events');

class StaffRoomService {
  /**
   * Creates a table group room for staff.
   * @param {Socket} socket - The socket instance.
   * @param {object} groupData - Data containing groupId, tableIds, and merchantId.
   * @returns {Promise<string>} - The room ID.
   */
  async createTableGroupRoom(socket, groupData) {
    try {
      const { groupId, tableIds, merchantId } = groupData;
      if (!groupId || !tableIds || !merchantId) {
        throw new AppError('Missing required group data', 400, 'INVALID_GROUP_DATA');
      }

      const roomData = {
        name: `table-group-${groupId}`,
        type: 'table-group',
        permissions: {
          roles: ['MERCHANT', 'STAFF', 'CUSTOMER'],
          customCheck: async (user) => {
            return user.merchantId === merchantId || tableIds.includes(user.tableId) || user.role === 'ADMIN';
          }
        }
      };

      const roomId = await roomManager.createRoom(socket, roomData);
      logger.info(`Table group room created: ${roomId}`, {
        userId: socket.user.id,
        groupId,
        merchantId
      });

      return roomId;
    } catch (error) {
      logger.error('Failed to create table group room:', {
        error: error.message,
        userId: socket.user.id,
        groupData
      });
      throw new AppError('Failed to create table group room', 500, 'ROOM_CREATION_FAILED', null, { groupData });
    }
  }

  /**
   * Creates a table service area room for staff.
   * @param {Socket} socket - The socket instance.
   * @param {object} areaData - Data containing areaId, merchantId, and staffIds.
   * @returns {Promise<string>} - The room ID.
   */
  async createTableServiceArea(socket, areaData) {
    try {
      const { areaId, merchantId, staffIds } = areaData;
      if (!areaId || !merchantId || !staffIds) {
        throw new AppError('Missing required area data', 400, 'INVALID_AREA_DATA');
      }

      const roomData = {
        name: `service-area-${areaId}`,
        type: 'service-area',
        permissions: {
          roles: ['MERCHANT', 'STAFF'],
          customCheck: async (user) => {
            return user.merchantId === merchantId || staffIds.includes(user.id) || user.role === 'ADMIN';
          }
        }
      };

      const roomId = await roomManager.createRoom(socket, roomData);
      logger.info(`Service area room created: ${roomId}`, {
        userId: socket.user.id,
        areaId,
        merchantId
      });

      return roomId;
    } catch (error) {
      logger.error('Failed to create service area room:', {
        error: error.message,
        userId: socket.user.id,
        areaData
      });
      throw new AppError('Failed to create service area room', 500, 'ROOM_CREATION_FAILED', null, { areaData });
    }
  }

  /**
   * Broadcasts an event to a table group room.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   * @param {string} groupId - The group ID identifying the room.
   * @param {string} event - The event name to emit.
   * @param {object} data - The data to broadcast.
   */
  async broadcastToTableGroup(io, groupId, event, data) {
    try {
      const roomId = `table-group:table-group-${groupId}`;
      io.to(roomId).emit(event, data);
      logger.info(`Broadcast to table group room: ${roomId}`, { event, data });
    } catch (error) {
      logger.error('Failed to broadcast to table group room:', {
        error: error.message,
        roomId: `table-group:table-group-${groupId}`,
        event
      });
      throw new AppError('Failed to broadcast to table group room', 500, 'BROADCAST_FAILED', null, { groupId, event });
    }
  }

  /**
   * Broadcasts an event to a service area room.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   * @param {string} areaId - The area ID identifying the room.
   * @param {string} event - The event name to emit.
   * @param {object} data - The data to broadcast.
   */
  async broadcastToServiceArea(io, areaId, event, data) {
    try {
      const roomId = `service-area:service-area-${areaId}`;
      io.to(roomId).emit(event, data);
      logger.info(`Broadcast to service area room: ${roomId}`, { event, data });
    } catch (error) {
      logger.error('Failed to broadcast to service area room:', {
        error: error.message,
        roomId: `service-area:service-area-${areaId}`,
        event
      });
      throw new AppError('Failed to broadcast to service area room', 500, 'BROADCAST_FAILED', null, { areaId, event });
    }
  }
}

module.exports = new StaffRoomService();