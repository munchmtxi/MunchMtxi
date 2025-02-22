// @handlers/merchantHandlers/profileHandlers/imageUploadHandler.js
const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');
const { models } = require('@models');
const imageHandler = require('@utils/imageHandler');
const roomManager = require('@services/RoomManager');
const merchantImageService = require('@services/merchantServices/profileServices/imageService');

const imageUploadHandler = {
  initialize(socket, io) {
    this.handleImageUpload(socket, io);
    this.handleImageDeletion(socket, io);
    this.handleImageUpdateError(socket, io);
    this.joinImageUpdateRoom(socket);
  },

  async joinImageUpdateRoom(socket) {
    try {
      const merchant = await models.Merchant.findOne({ 
        where: { userId: socket.user.id }
      });
      
      if (merchant) {
        const roomId = await roomManager.createRoom(socket, {
          name: `merchant-${merchant.id}-images`,
          type: 'merchant-image-updates',
          permissions: {
            roles: ['MERCHANT', 'ADMIN'],
            customCheck: async (user) => {
              return user.id === merchant.userId || user.role === 'ADMIN';
            }
          }
        });
        
        await roomManager.joinRoom(socket, roomId);
        logger.info(`Merchant ${merchant.id} joined image updates room`);
      }
    } catch (error) {
      logger.error('Error joining image update room:', error);
    }
  },

  handleImageUpload(socket, io) {
    socket.on(EVENTS.MERCHANT.PROFILE.UPDATE_REQUESTED, async (data) => {
      try {
        const { type, file } = data;
        const merchantId = socket.user.id;

        // Emit status update
        socket.emit(EVENTS.MERCHANT.PROFILE.UPDATE_REQUESTED, {
          type,
          status: 'processing'
        });

        // Process image upload
        const result = await merchantImageService.uploadImage(
          merchantId,
          file,
          type
        );

        // Broadcast success to relevant room
        const roomId = `merchant-image-updates:merchant-${merchantId}-images`;
        io.to(roomId).emit(EVENTS.MERCHANT.PROFILE.UPDATE_SUCCEEDED, {
          type,
          data: result
        });

        logger.info(`Image upload successful for merchant ${merchantId}`, {
          type,
          filename: result.data[`${type}Url`]
        });

      } catch (error) {
        logger.error('Image upload error:', error);
        socket.emit(EVENTS.MERCHANT.PROFILE.VALIDATION_ERROR, {
          type: data.type,
          error: error.message
        });

        // Broadcast error to relevant room
        const roomId = `merchant-image-updates:merchant-${socket.user.id}-images`;
        io.to(roomId).emit(EVENTS.MERCHANT.PROFILE.UPDATE_FAILED, {
          type: data.type,
          error: error.message
        });
      }
    });
  },

  handleImageDeletion(socket, io) {
    socket.on(EVENTS.MERCHANT.PROFILE[`${type}_DELETION_REQUESTED`], async (data) => {
      try {
        const { type } = data;
        const merchantId = socket.user.id;

        // Emit deletion status
        socket.emit(EVENTS.MERCHANT.PROFILE.UPDATE_REQUESTED, {
          type,
          status: 'deleting'
        });

        // Process image deletion
        const result = await merchantImageService.deleteImage(
          merchantId,
          type
        );

        // Broadcast success to relevant room
        const roomId = `merchant-image-updates:merchant-${merchantId}-images`;
        io.to(roomId).emit(EVENTS.MERCHANT.PROFILE.UPDATE_SUCCEEDED, {
          type,
          data: result
        });

        logger.info(`Image deletion successful for merchant ${merchantId}`, {
          type
        });

      } catch (error) {
        logger.error('Image deletion error:', error);
        socket.emit(EVENTS.MERCHANT.PROFILE.VALIDATION_ERROR, {
          type: data.type,
          error: error.message
        });

        // Broadcast error to relevant room
        const roomId = `merchant-image-updates:merchant-${socket.user.id}-images`;
        io.to(roomId).emit(EVENTS.MERCHANT.PROFILE.UPDATE_FAILED, {
          type: data.type,
          error: error.message
        });
      }
    });
  },

  handleImageUpdateError(socket, io) {
    socket.on(EVENTS.ERROR, async (error) => {
      if (error.context === 'image-upload') {
        logger.error('Image upload error handler:', error);
        
        // Notify merchant of error
        const merchantId = socket.user.id;
        const roomId = `merchant-image-updates:merchant-${merchantId}-images`;
        
        io.to(roomId).emit(EVENTS.MERCHANT.PROFILE.UPDATE_FAILED, {
          error: error.message,
          timestamp: new Date(),
          context: error.context
        });
      }
    });
  }
};

module.exports = imageUploadHandler;
