// src/services/merchantServices/merchantService.js
const { Merchant, User } = require('@models');
const AppError = require('@utils/AppError');
const { securityAuditLogger } = require('@services/securityAuditLogger');
const roomManager = require('@services/RoomManager');
const { EVENTS } = require('@config/events');

class MerchantService {
  /**
   * Core merchant verification and access
   */
  async verifyMerchantAccess(merchantId, userId) {
    const merchant = await Merchant.findOne({
      where: { 
        id: merchantId,
        user_id: userId
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['email']
      }]
    });

    if (!merchant) {
      throw new AppError('Unauthorized merchant access', 403, 'MERCHANT_ACCESS_DENIED');
    }

    return merchant;
  }

  /**
   * Room management for merchant features
   */
  async getMerchantRooms(merchantId) {
    const rooms = await roomManager.getUserAccessibleRooms({ 
      id: merchantId, 
      role: 'MERCHANT' 
    });
    return rooms;
  }

  async joinMerchantRooms(socket, merchantId) {
    const merchant = await this.verifyMerchantAccess(merchantId, socket.user.id);
    
    // Join merchant-specific room
    await roomManager.createRoom(socket, {
      name: `merchant-${merchantId}`,
      type: 'merchant',
      permissions: {
        roles: ['MERCHANT', 'STAFF'],
        customCheck: async (user) => user.merchantId === merchantId
      }
    });

    // Join business type room
    await roomManager.createRoom(socket, {
      name: `business-${merchant.business_type}`,
      type: 'business-type',
      permissions: {
        roles: ['MERCHANT']
      }
    });

    // Log room joining
    await this.logMerchantActivity(merchantId, 'ROOMS_JOINED', {
      businessType: merchant.business_type
    });
  }

  /**
   * Activity logging
   */
  async logMerchantActivity(merchantId, activity, metadata = {}) {
    await securityAuditLogger.logSecurityAudit('MERCHANT_ACTIVITY', {
      userId: merchantId,
      activity,
      metadata,
      category: 'merchant_operations'
    });
  }

  /**
   * Merchant status management
   */
  async updateMerchantStatus(merchantId, status, metadata = {}) {
    const merchant = await this.verifyMerchantAccess(merchantId, metadata.userId);
    
    // Update status
    await merchant.update({ status });
    
    // Log status change
    await this.logMerchantActivity(merchantId, 'STATUS_UPDATED', {
      previousStatus: merchant.status,
      newStatus: status,
      ...metadata
    });

    return { 
      merchantId,
      status,
      updatedAt: new Date()
    };
  }

  /**
   * Business hours management
   */
  async getBusinessHours(merchantId) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }
    return merchant.format_business_hours();
  }

  /**
   * Merchant type specific operations
   */
  async getMerchantTypeConfig(merchantId) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Return type-specific configuration
    if (merchant.business_type === 'restaurant') {
      return {
        allowsBookings: true,
        allowsQuickLinks: true,
        requiresTableManagement: true
      };
    } else if (merchant.business_type === 'grocery') {
      return {
        allowsBookings: false,
        allowsQuickLinks: false,
        requiresInventoryManagement: true
      };
    }

    return {};
  }

  /**
   * Merchant validation and checks
   */
  async validateMerchantOperation(merchantId, operation, metadata = {}) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Validate operation based on merchant type and status
    const typeConfig = await this.getMerchantTypeConfig(merchantId);
    
    switch (operation) {
      case 'BOOKING':
        if (!typeConfig.allowsBookings) {
          throw new AppError('Bookings not allowed for this merchant type', 400, 'OPERATION_NOT_SUPPORTED');
        }
        break;
      case 'QUICK_LINK':
        if (!typeConfig.allowsQuickLinks) {
          throw new AppError('Quick links not allowed for this merchant type', 400, 'OPERATION_NOT_SUPPORTED');
        }
        break;
      // Add more operation validations as needed
    }

    return true;
  }
}

module.exports = new MerchantService();