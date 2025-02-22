// src/handlers/merchantHandlers/profileHandlers/draftHandlers.js
const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');
const draftService = require('@services/merchantServices/profileServices/draftService');
const roomService = require('@services/roomService');

const draftHandlers = {
  handleDraftUpdate: (socket, io) => {
    socket.on(EVENTS.MERCHANT.DRAFT.UPDATE, async (data) => {
      try {
        const updatedDraft = await draftService.createOrUpdateDraft(
          socket.user.merchantId,
          socket.user.id,
          data,
          socket.user.token
        );

        // Broadcast to relevant staff members
        await roomService.broadcastToMerchantStaff(
          io,
          socket.user.merchantId,
          EVENTS.MERCHANT.DRAFT.UPDATED,
          {
            merchantId: socket.user.merchantId,
            draft: updatedDraft
          }
        );

        socket.emit(EVENTS.MERCHANT.DRAFT.UPDATED, {
          status: 'success',
          data: updatedDraft
        });

        logger.info(`Merchant draft updated: ${socket.user.merchantId}`);
      } catch (error) {
        logger.error('Draft update error:', error);
        socket.emit(EVENTS.ERROR, {
          message: 'Failed to update draft',
          error: error.message
        });
      }
    });
  },

  handleDraftSubmit: (socket, io) => {
    socket.on(EVENTS.MERCHANT.DRAFT.SUBMIT, async () => {
      try {
        const submittedDraft = await draftService.submitDraft(
          socket.user.merchantId,
          socket.user.id
        );

        await roomService.broadcastToMerchantStaff(
          io,
          socket.user.merchantId,
          EVENTS.MERCHANT.DRAFT.SUBMITTED,
          {
            merchantId: socket.user.merchantId,
            draft: submittedDraft
          }
        );

        socket.emit(EVENTS.MERCHANT.DRAFT.SUBMITTED, {
          status: 'success',
          data: submittedDraft
        });

        logger.info(`Merchant draft submitted: ${socket.user.merchantId}`);
      } catch (error) {
        logger.error('Draft submission error:', error);
        socket.emit(EVENTS.ERROR, {
          message: 'Failed to submit draft',
          error: error.message
        });
      }
    });
  }
};

module.exports = draftHandlers;