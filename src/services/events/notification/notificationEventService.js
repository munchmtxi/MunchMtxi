const eventManager = require('../core/eventManager');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');
const { EVENTS } = require('@config/events');

class NotificationEventService {
  constructor() {
    eventManager.on(EVENTS.NOTIFICATION.SENT, this.handleNotificationSent.bind(this));
  }

  /**
   * Handles the NOTIFICATION_SENT event.
   * @param {object} data - Event data including eventId, payload, socket, and io.
   */
  async handleNotificationSent({ eventId, payload, socket, io }) {
    try {
      const { notificationId, userId, type } = payload;
      if (!notificationId || !userId || !type) {
        throw new AppError('Missing required notification data', 400, 'INVALID_NOTIFICATION_DATA');
      }

      logger.info(`Notification sent: ${eventId}`, { notificationId, userId, type });

      // Notify the user via Socket.IO
      if (io) {
        io.to(`user:${userId}`).emit(EVENTS.NOTIFICATION.NEW, payload);
      }
    } catch (error) {
      logger.error('Failed to handle NOTIFICATION_SENT event:', {
        eventId,
        error: error.message,
        payload
      });
      throw error;
    }
  }
}

module.exports = new NotificationEventService();