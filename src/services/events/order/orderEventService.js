const eventManager = require('../core/eventManager');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { EVENTS } = require('@config/events');

class OrderEventService {
  constructor() {
    eventManager.on(EVENTS.ORDER.CREATED, this.handleOrderCreated.bind(this));
    eventManager.on(EVENTS.ORDER.UPDATED, this.handleOrderUpdated.bind(this));
    eventManager.on(EVENTS.ORDER.CANCELLED, this.handleOrderCancelled.bind(this));
  }

  /**
   * Handles the ORDER_CREATED event.
   * @param {object} data - Event data including eventId, payload, socket, and io.
   */
  async handleOrderCreated({ eventId, payload, socket, io }) {
    try {
      const { orderId, merchantId, customerId } = payload;
      if (!orderId || !merchantId || !customerId) {
        throw new AppError('Missing required order data', 400, 'INVALID_ORDER_DATA');
      }

      logger.info(`Order created: ${eventId}`, { orderId, merchantId, customerId });

      // Example: Broadcast to merchant and customer rooms
      io.to(`merchant-${merchantId}`).emit('ORDER_CREATED', payload);
      io.to(`user:${customerId}`).emit('ORDER_CREATED', payload);
    } catch (error) {
      logger.error('Failed to handle ORDER_CREATED event:', {
        eventId,
        error: error.message,
        payload
      });
      throw error;
    }
  }

  /**
   * Handles the ORDER_UPDATED event.
   * @param {object} data - Event data including eventId, payload, socket, and io.
   */
  async handleOrderUpdated({ eventId, payload, socket, io }) {
    try {
      const { orderId, status } = payload;
      if (!orderId || !status) {
        throw new AppError('Missing required update data', 400, 'INVALID_UPDATE_DATA');
      }

      logger.info(`Order updated: ${eventId}`, { orderId, status });

      // Example: Broadcast to order room
      io.to(`order-${orderId}`).emit('ORDER_UPDATED', payload);
    } catch (error) {
      logger.error('Failed to handle ORDER_UPDATED event:', {
        eventId,
        error: error.message,
        payload
      });
      throw error;
    }
  }

  /**
   * Handles the ORDER_CANCELLED event.
   * @param {object} data - Event data including eventId, payload, socket, and io.
   */
  async handleOrderCancelled({ eventId, payload, socket, io }) {
    try {
      const { orderId, reason } = payload;
      if (!orderId) {
        throw new AppError('Missing order ID', 400, 'INVALID_CANCEL_DATA');
      }

      logger.info(`Order cancelled: ${eventId}`, { orderId, reason });

      // Example: Notify all relevant parties
      io.to(`order-${orderId}`).emit('ORDER_CANCELLED', payload);
    } catch (error) {
      logger.error('Failed to handle ORDER_CANCELLED event:', {
        eventId,
        error: error.message,
        payload
      });
      throw error;
    }
  }
}

module.exports = new OrderEventService();