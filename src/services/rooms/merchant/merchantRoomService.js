const roomManager = require('../core/roomManager');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { EVENTS } = require('@config/events');

class MerchantRoomService {
  /**
   * Creates an order processing room for merchants.
   * @param {Socket} socket - The socket instance.
   * @param {string} orderId - The order ID.
   * @param {string} merchantId - The merchant ID.
   * @returns {Promise<string>} - The room ID.
   */
  async createOrderProcessingRoom(socket, orderId, merchantId) {
    try {
      const roomData = {
        name: `order-${orderId}`,
        type: 'order-processing',
        permissions: {
          roles: ['MERCHANT', 'STAFF', 'DRIVER', 'CUSTOMER'],
          customCheck: async (user) => {
            return user.id === merchantId || user.id === socket.user.id || user.role === 'ADMIN';
          }
        }
      };

      const roomId = await roomManager.createRoom(socket, roomData);
      logger.info(`Order processing room created: ${roomId}`, {
        userId: socket.user.id,
        orderId,
        merchantId
      });

      return roomId;
    } catch (error) {
      logger.error('Failed to create order processing room:', {
        error: error.message,
        userId: socket.user.id,
        orderId,
        merchantId
      });
      throw new AppError('Failed to create order processing room', 500, 'ROOM_CREATION_FAILED', null, { orderId, merchantId });
    }
  }

  /**
   * Creates a merchant staff room.
   * @param {Socket} socket - The socket instance.
   * @param {string} merchantId - The merchant ID.
   * @returns {Promise<string>} - The room ID.
   */
  async createMerchantStaffRoom(socket, merchantId) {
    try {
      const roomData = {
        name: `merchant-${merchantId}-staff`,
        type: 'merchant-staff',
        permissions: {
          roles: ['MERCHANT', 'STAFF'],
          customCheck: async (user) => {
            return user.merchantId === merchantId || user.role === 'ADMIN';
          }
        }
      };

      const roomId = await roomManager.createRoom(socket, roomData);
      logger.info(`Merchant staff room created: ${roomId}`, {
        userId: socket.user.id,
        merchantId
      });

      return roomId;
    } catch (error) {
      logger.error('Failed to create merchant staff room:', {
        error: error.message,
        userId: socket.user.id,
        merchantId
      });
      throw new AppError('Failed to create staff room', 500, 'ROOM_CREATION_FAILED', null, { merchantId });
    }
  }

  /**
   * Broadcasts an event to an order processing room.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   * @param {string} orderId - The order ID identifying the room.
   * @param {string} event - The event name to emit.
   * @param {object} data - The data to broadcast.
   */
  async broadcastToOrderRoom(io, orderId, event, data) {
    try {
      const roomId = `order-processing:order-${orderId}`;
      io.to(roomId).emit(event, data);
      logger.info(`Broadcast to order room: ${roomId}`, { event, data });
    } catch (error) {
      logger.error('Failed to broadcast to order room:', {
        error: error.message,
        roomId: `order-processing:order-${orderId}`,
        event
      });
      throw new AppError('Failed to broadcast to order room', 500, 'BROADCAST_FAILED', null, { orderId, event });
    }
  }

  /**
   * Broadcasts an event to a merchant staff room.
   * @param {SocketIO.Server} io - The Socket.IO server instance.
   * @param {string} merchantId - The merchant ID identifying the room.
   * @param {string} event - The event name to emit.
   * @param {object} data - The data to broadcast.
   */
  async broadcastToMerchantStaff(io, merchantId, event, data) {
    try {
      const roomId = `merchant-staff:merchant-${merchantId}-staff`;
      io.to(roomId).emit(event, data);
      logger.info(`Broadcast to merchant staff room: ${roomId}`, { event, data });
    } catch (error) {
      logger.error('Failed to broadcast to merchant staff room:', {
        error: error.message,
        roomId: `merchant-staff:merchant-${merchantId}-staff`,
        event
      });
      throw new AppError('Failed to broadcast to staff room', 500, 'BROADCAST_FAILED', null, { merchantId, event });
    }
  }
}

module.exports = new MerchantRoomService();