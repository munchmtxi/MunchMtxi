const eventManager = require('../core/eventManager');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { EVENTS } = require('@config/events');

class PaymentEventService {
  constructor() {
    eventManager.on(EVENTS.PAYMENT.INITIATED, this.handlePaymentInitiated.bind(this));
    eventManager.on(EVENTS.PAYMENT.COMPLETED, this.handlePaymentCompleted.bind(this));
    eventManager.on(EVENTS.PAYMENT.FAILED, this.handlePaymentFailed.bind(this));
  }

  /**
   * Handles the PAYMENT_INITIATED event.
   * @param {object} data - Event data including eventId, payload, socket, and io.
   */
  async handlePaymentInitiated({ eventId, payload, socket, io }) {
    try {
      const { paymentId, amount, userId } = payload;
      if (!paymentId || !amount || !userId) {
        throw new AppError('Missing required payment data', 400, 'INVALID_PAYMENT_DATA');
      }

      logger.info(`Payment initiated: ${eventId}`, { paymentId, amount, userId });

      io.to(`user:${userId}`).emit('PAYMENT_INITIATED', payload);
    } catch (error) {
      logger.error('Failed to handle PAYMENT_INITIATED event:', {
        eventId,
        error: error.message,
        payload
      });
      throw error;
    }
  }

  /**
   * Handles the PAYMENT_COMPLETED event.
   * @param {object} data - Event data including eventId, payload, socket, and io.
   */
  async handlePaymentCompleted({ eventId, payload, socket, io }) {
    try {
      const { paymentId, amount, userId } = payload;
      if (!paymentId || !amount || !userId) {
        throw new AppError('Missing required payment data', 400, 'INVALID_PAYMENT_DATA');
      }

      logger.info(`Payment completed: ${eventId}`, { paymentId, amount, userId });

      io.to(`user:${userId}`).emit('PAYMENT_COMPLETED', payload);
    } catch (error) {
      logger.error('Failed to handle PAYMENT_COMPLETED event:', {
        eventId,
        error: error.message,
        payload
      });
      throw error;
    }
  }

  /**
   * Handles the PAYMENT_FAILED event.
   * @param {object} data - Event data including eventId, payload, socket, and io.
   */
  async handlePaymentFailed({ eventId, payload, socket, io }) {
    try {
      const { paymentId, reason, userId } = payload;
      if (!paymentId || !userId) {
        throw new AppError('Missing required payment data', 400, 'INVALID_PAYMENT_DATA');
      }

      logger.info(`Payment failed: ${eventId}`, { paymentId, reason, userId });

      io.to(`user:${userId}`).emit('PAYMENT_FAILED', payload);
    } catch (error) {
      logger.error('Failed to handle PAYMENT_FAILED event:', {
        eventId,
        error: error.message,
        payload
      });
      throw error;
    }
  }
}

module.exports = new PaymentEventService();