// src/handlers/merchantHandlers/profileHandlers/businessTypeHandlers.js

const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');
const businessTypeService = require('@services/merchantServices/profileServices/businessTypeService');
const roomService = require('@services/roomService');
const { securityAuditLogger } = require('@services/securityAuditLogger');
const { validateBusinessTypeUpdate } = require('@validators/merchantValidators/profileValidators/businessTypeValidator');
const { BUSINESS_TYPES } = require('@config/constants/businessTypes');

// Import EventEmitter and define BusinessTypeHandler class
const EventEmitter = require('events');
class BusinessTypeHandler extends EventEmitter {
  constructor() {
    super();
    this.service = businessTypeService;
  }

  async handleTypeUpdate(socket, data) {
    try {
      const updated = await this.service.updateType(data.id, data);
      socket.emit('businessType:updated', { status: 'success', data: updated });
    } catch (error) {
      socket.emit('businessType:error', { status: 'error', message: error.message });
    }
  }
}

// Export an instance of BusinessTypeHandler
module.exports.BusinessTypeHandler = new BusinessTypeHandler();

// Original handlers remain unchanged
const businessTypeHandlers = {
  handleBusinessTypeUpdate: (socket, io) => {
    socket.on(EVENTS.MERCHANT.BUSINESS_TYPE.UPDATE, async (data) => {
      try {
        // Validate update data
        const { error, value } = validateBusinessTypeUpdate(data);
        if (error) {
          socket.emit(EVENTS.MERCHANT.BUSINESS_TYPE.VALIDATION_FAILED, {
            status: 'error',
            error: error.details,
          });
          return;
        }

        // Log the update attempt
        await securityAuditLogger.logSecurityAudit('MERCHANT_BUSINESS_TYPE_UPDATE_ATTEMPT', {
          userId: socket.user.id,
          merchantId: socket.user.merchantId,
          severity: 'info',
          metadata: {
            attempted_update: value,
          },
        });

        // Process the update
        const updatedMerchant = await businessTypeService.updateBusinessType(
          socket.user.merchantId,
          socket.user.id,
          value
        );

        // Broadcast to merchant staff room
        await roomService.broadcastToMerchantStaff(
          io,
          socket.user.merchantId,
          EVENTS.MERCHANT.BUSINESS_TYPE.UPDATED,
          {
            merchantId: socket.user.merchantId,
            business_type: updatedMerchant.business_type,
            business_type_details: updatedMerchant.business_type_details,
          }
        );

        // Emit success to initiator
        socket.emit(EVENTS.MERCHANT.BUSINESS_TYPE.UPDATED, {
          status: 'success',
          data: {
            merchant: {
              id: updatedMerchant.id,
              business_type: updatedMerchant.business_type,
              business_type_details: updatedMerchant.business_type_details,
            },
          },
        });

        logger.info(`Business type updated for merchant: ${socket.user.merchantId}`);
      } catch (error) {
        logger.error('Business type update error:', error);

        // Log the failure
        await securityAuditLogger.logSecurityAudit('MERCHANT_BUSINESS_TYPE_UPDATE_FAILED', {
          userId: socket.user.id,
          merchantId: socket.user.merchantId,
          severity: 'warning',
          metadata: {
            error: error.message,
            attempted_update: data,
          },
        });

        socket.emit(EVENTS.ERROR, {
          message: 'Failed to update business type',
          error: error.message,
        });
      }
    });
  },

  handleBusinessTypePreview: (socket) => {
    socket.on(EVENTS.MERCHANT.BUSINESS_TYPE.PREVIEW_REQUESTED, async (data) => {
      try {
        const requirements = await businessTypeService.getBusinessTypeRequirements(
          data.business_type
        );
        socket.emit(EVENTS.MERCHANT.BUSINESS_TYPE.PREVIEW_GENERATED, {
          status: 'success',
          data: {
            new_type: data.business_type,
            requirements,
            required_changes: {
              fields_to_add: requirements.requiredFields,
              licenses_needed: requirements.requiredLicenses,
              available_service_types: requirements.allowedServiceTypes,
            },
          },
        });
      } catch (error) {
        logger.error('Business type preview error:', error);
        socket.emit(EVENTS.ERROR, {
          message: 'Failed to generate business type preview',
          error: error.message,
        });
      }
    });
  },

  // Handler for connecting/disconnecting from merchant rooms
  setupMerchantTypeRooms: (socket) => {
    // Join merchant-specific room for business type updates
    const merchantRoom = `merchant:${socket.user.merchantId}:business-type`;
    socket.join(merchantRoom);
    socket.on('disconnect', () => {
      socket.leave(merchantRoom);
    });
  },
};

// Export all handlers
module.exports = businessTypeHandlers;