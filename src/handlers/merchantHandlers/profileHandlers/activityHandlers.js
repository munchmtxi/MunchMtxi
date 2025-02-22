// src/handlers/merchantHandlers/profileHandlers/activityHandlers.js
const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');
const activityLogService = require('@services/merchantServices/profileServices/activityLogService');
const roomService = require('@services/roomService');

const activityHandlers = {
  handleActivityStream: (socket, io) => {
    socket.on(EVENTS.MERCHANT.ACTIVITY.SUBSCRIBE, async () => {
      try {
        const roomName = `merchant:${socket.user.merchantId}:activity`;
        await socket.join(roomName);

        socket.emit(EVENTS.MERCHANT.ACTIVITY.SUBSCRIBED, {
          status: 'success',
          message: 'Subscribed to activity updates'
        });

        logger.info(`Client subscribed to activity stream: ${socket.user.merchantId}`);
      } catch (error) {
        logger.error('Activity subscription error:', error);
        socket.emit(EVENTS.ERROR, {
          message: 'Failed to subscribe to activity updates',
          error: error.message
        });
      }
    });

    socket.on(EVENTS.MERCHANT.ACTIVITY.UNSUBSCRIBE, async () => {
      try {
        const roomName = `merchant:${socket.user.merchantId}:activity`;
        await socket.leave(roomName);

        socket.emit(EVENTS.MERCHANT.ACTIVITY.UNSUBSCRIBED, {
          status: 'success',
          message: 'Unsubscribed from activity updates'
        });

        logger.info(`Client unsubscribed from activity stream: ${socket.user.merchantId}`);
      } catch (error) {
        logger.error('Activity unsubscription error:', error);
        socket.emit(EVENTS.ERROR, {
          message: 'Failed to unsubscribe from activity updates',
          error: error.message
        });
      }
    });
  }
};

module.exports = activityHandlers;