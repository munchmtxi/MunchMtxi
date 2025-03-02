const roomManager = require('../core/roomManager');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { EVENTS } = require('@config/events');

class AdminRoomService {
  /**
   * Creates an admin monitoring room.
   * @param {Socket} socket - The socket instance.
   * @param {string} monitoringType - Type of monitoring (e.g., 'system', 'performance').
   * @returns {Promise<string>} - The room ID.
   */
  async createAdminMonitoringRoom(socket, monitoringType) {
    try {
      const roomData = {
        name: `monitoring-${monitoringType}`,
        type: 'admin-monitoring',
        permissions: {
          roles: ['ADMIN'],
          customCheck: async (user) => {
            return user.isSuper || user.permissions.includes(`monitor:${monitoringType}`);
          }
        }
      };

      const roomId = await roomManager.createRoom(socket, roomData);
      logger.info(`Admin monitoring room created: ${roomId}`, {
        userId: socket.user.id,
        monitoringType
      });

      return roomId;
    } catch (error) {
      logger.error('Failed to create admin monitoring room:', {
        error: error.message,
        userId: socket.user.id,
        monitoringType
      });
      throw new AppError('Failed to create monitoring room', 500, 'ROOM_CREATION_FAILED', null, { monitoringType });
    }
  }

  /**
   * Broadcasts an event to an admin monitoring room.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   * @param {string} monitoringType - The monitoring type identifying the room.
   * @param {string} event - The event name to emit.
   * @param {object} data - The data to broadcast.
   */
  async broadcastToAdminMonitoringRoom(io, monitoringType, event, data) {
    try {
      const roomId = `admin-monitoring:monitoring-${monitoringType}`;
      io.to(roomId).emit(event, data);
      logger.info(`Broadcast to admin monitoring room: ${roomId}`, { event, data });
    } catch (error) {
      logger.error('Failed to broadcast to admin monitoring room:', {
        error: error.message,
        roomId: `admin-monitoring:monitoring-${monitoringType}`,
        event
      });
      throw new AppError('Failed to broadcast to monitoring room', 500, 'BROADCAST_FAILED', null, { event, monitoringType });
    }
  }
}

module.exports = new AdminRoomService();