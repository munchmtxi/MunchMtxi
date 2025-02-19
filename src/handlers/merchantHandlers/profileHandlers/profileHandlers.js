// src/handlers/merchantHandlers/profileHandlers/profileHandlers.js
const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');
const { updateProfile } = require('@services/merchantServices/profileServices/profileService');
const roomService = require('@services/roomService');

const profileHandlers = {
  handleProfileUpdate: (socket, io) => {
    socket.on(EVENTS.MERCHANT.PROFILE_UPDATE, async (data) => {
      try {
        const updatedProfile = await updateProfile(
          socket.user.merchantId,
          data,
          socket.user.token
        );

        await roomService.broadcastToMerchantStaff(
          io,
          socket.user.merchantId,
          EVENTS.MERCHANT.PROFILE_UPDATED,
          {
            merchantId: socket.user.merchantId,
            profile: updatedProfile
          }
        );

        socket.emit(EVENTS.MERCHANT.PROFILE_UPDATED, {
          status: 'success',
          data: updatedProfile
        });

        logger.info(`Merchant profile updated: ${socket.user.merchantId}`);
      } catch (error) {
        logger.error('Profile update error:', error);
        socket.emit(EVENTS.ERROR, {
          message: 'Failed to update profile',
          error: error.message
        });
      }
    });
  }
};

module.exports = profileHandlers;