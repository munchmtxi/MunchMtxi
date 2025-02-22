// src/handlers/merchantHandlers/profileHandlers/previewHandlers.js
const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');
const previewService = require('@services/merchantServices/profileServices/previewService');
const roomService = require('@services/roomService');

const previewHandlers = {
  handlePreviewStart: (socket, io) => {
    socket.on(EVENTS.MERCHANT.PREVIEW.START, async () => {
      try {
        const previewData = await previewService.startPreview(
          socket.user.merchantId,
          socket.user.id
        );

        // Join preview room
        const previewRoom = `merchant:${socket.user.merchantId}:preview`;
        socket.join(previewRoom);

        socket.emit(EVENTS.MERCHANT.PREVIEW.START, {
          status: 'success',
          data: previewData
        });

        logger.info(`Preview started for merchant: ${socket.user.merchantId}`);
      } catch (error) {
        logger.error('Preview start error:', error);
        socket.emit(EVENTS.ERROR, {
          message: 'Failed to start preview',
          error: error.message
        });
      }
    });
  },

  handlePreviewUpdate: (socket, io) => {
    socket.on(EVENTS.MERCHANT.PREVIEW.UPDATE, async (updates) => {
      try {
        const updatedPreview = await previewService.updatePreview(
          socket.user.merchantId,
          socket.user.id,
          updates
        );

        const previewRoom = `merchant:${socket.user.merchantId}:preview`;
        io.to(previewRoom).emit(EVENTS.MERCHANT.PREVIEW.UPDATE, {
          status: 'success',
          data: updatedPreview
        });

        logger.info(`Preview updated for merchant: ${socket.user.merchantId}`);
      } catch (error) {
        logger.error('Preview update error:', error);
        socket.emit(EVENTS.ERROR, {
          message: 'Failed to update preview',
          error: error.message
        });
      }
    });
  },

  handlePreviewEnd: (socket, io) => {
    socket.on(EVENTS.MERCHANT.PREVIEW.END, async () => {
      try {
        await previewService.endPreview(socket.user.merchantId, socket.user.id);
        
        const previewRoom = `merchant:${socket.user.merchantId}:preview`;
        socket.leave(previewRoom);

        socket.emit(EVENTS.MERCHANT.PREVIEW.END, {
          status: 'success'
        });

        logger.info(`Preview ended for merchant: ${socket.user.merchantId}`);
      } catch (error) {
        logger.error('Preview end error:', error);
        socket.emit(EVENTS.ERROR, {
          message: 'Failed to end preview',
          error: error.message
        });
      }
    });
  }
};

module.exports = previewHandlers;