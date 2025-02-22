// src/handlers/merchantHandlers/profileHandlers/bannerHandlers.js
const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');
const bannerService = require('@services/merchantServices/profileServices/bannerService');
const roomService = require('@services/roomService');

const bannerHandlers = {
  handleBannerUpdates: (socket, io) => {
    socket.on(EVENTS.MERCHANT.BANNER.UPDATE, async (data) => {
      try {
        await roomService.broadcastToMerchantStaff(
          io,
          socket.user.merchantId,
          EVENTS.MERCHANT.BANNER.UPDATED,
          {
            merchantId: socket.user.merchantId,
            banners: data
          }
        );

        logger.info(`Merchant banners updated: ${socket.user.merchantId}`);
      } catch (error) {
        logger.error('Banner update error:', error);
        socket.emit(EVENTS.ERROR, {
          message: 'Failed to update banners',
          error: error.message
        });
      }
    });
  }
};

module.exports = bannerHandlers;
