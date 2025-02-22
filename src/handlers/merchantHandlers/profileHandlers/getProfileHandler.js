// src/handlers/merchantHandlers/profileHandlers/getProfileHandler.js
const { EVENTS } = require('@config/events');
const { logger } = require('@utils/logger');
const getProfileService = require('@services/merchantServices/profileServices/getProfileService');

class GetProfileHandler {
  constructor(io, socket) {
    this.io = io;
    this.socket = socket;
    this.userId = socket.user?.id;
    this.merchantId = socket.user?.merchantId;
  }

  async handle() {
    try {
      if (!this.merchantId) {
        return this.handleError('Merchant ID not found');
      }

      const profile = await getProfileService.execute(this.merchantId);

      // Emit success to requester
      this.socket.emit(EVENTS.MERCHANT.PROFILE.VIEWED, {
        status: 'success',
        data: profile
      });

      // Log successful retrieval
      logger.info('Profile retrieved successfully', {
        userId: this.userId,
        merchantId: this.merchantId
      });

    } catch (error) {
      this.handleError(error.message);
    }
  }

  handleError(message) {
    logger.error('Profile retrieval error:', {
      merchantId: this.merchantId,
      userId: this.userId,
      error: message
    });

    this.socket.emit(EVENTS.MERCHANT.PROFILE.GET_ERROR, {
      status: 'error',
      message
    });
  }
}

// Factory function for creating handler instances
module.exports = function createGetProfileHandler(io) {
  return {
    register: (socket) => {
      const handler = new GetProfileHandler(io, socket);
      
      socket.on(EVENTS.MERCHANT.PROFILE.GET, () => handler.handle());
      
      return handler;
    }
  };
};