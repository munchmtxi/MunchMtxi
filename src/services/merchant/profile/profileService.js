// src/services/merchant/profile/profileService.js
const { Merchant, MerchantBranch, User } = require('@models');
const AppError = require('@utils/AppError');
const SecurityAuditLogger = require('@services/common/securityAuditLogger');
const TokenService = require('@services/common/tokenService');
const EventManager = require('@services/events/core/eventManager');
const { logger } = require('@utils/logger');
const { getBusinessTypes } = require('@config/constants/businessTypes');
const { BUSINESS_TYPES } = getBusinessTypes();

const merchantProfileService = {
  async getProfile(merchantId, { includeBranches = false } = {}) {
    const include = [{
      model: User,
      as: 'user',
      attributes: ['email']
    }];
    if (includeBranches) {
      include.push({
        model: MerchantBranch,
        as: 'branches',
        attributes: ['id', 'name', 'branch_code', 'address', 'is_active']
      });
    }

    const merchant = await Merchant.findByPk(merchantId, { include });

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    logger.info('Merchant profile retrieved', { merchantId, includeBranches });
    return merchant;
  },

  async updateProfile(merchantId, updateData, authToken) {
    const isBlacklisted = await TokenService.isTokenBlacklisted(merchantId);
    if (isBlacklisted) {
      throw new AppError('Session expired', 401, 'TOKEN_BLACKLISTED');
    }

    const merchant = await this.getProfile(merchantId);

    if (merchant.status !== MERCHANT_PROFILE_STATUSES.ACTIVE) {
      throw new AppError('Merchant account is not active', 403, 'MERCHANT_INACTIVE');
    }

    await SecurityAuditLogger.logSecurityAudit('MERCHANT_PROFILE_UPDATE', {
      userId: merchant.user_id,
      merchantId,
      severity: 'info',
      metadata: {
        previousData: merchant.toJSON(),
        updateAttempt: updateData,
        userEmail: merchant.user.email
      },
      compliance: {
        category: 'data_modification',
        violations: null
      }
    });

    if (updateData.phone_number && updateData.phone_number !== merchant.phone_number) {
      const existingMerchant = await Merchant.findOne({
        where: { phone_number: updateData.phone_number }
      });
      if (existingMerchant) {
        throw new AppError(
          'Phone number already in use',
          400,
          'DUPLICATE_PHONE_NUMBER',
          { field: 'phone_number' }
        );
      }
    }

    if (updateData.business_type_details) {
      const typeConfig = BUSINESS_TYPES[merchant.business_type.toUpperCase()];
      if (!typeConfig) {
        throw new AppError('Invalid business type', 400, 'INVALID_BUSINESS_TYPE');
      }
      const details = { ...merchant.business_type_details, ...updateData.business_type_details };
      const isValid = merchant.validateBusinessTypeDetails.call({ ...merchant.dataValues, business_type_details: details });
      if (!isValid) {
        throw new AppError('Invalid business type details', 400, 'INVALID_BUSINESS_TYPE_DETAILS');
      }
      updateData.business_type_details = details;
    }

    await merchant.update(updateData);

    EventManager.emit(MERCHANT_PROFILE_UPDATE_EVENTS.PROFILE_UPDATED, {
      merchantId,
      updatedData: updateData,
      timestamp: new Date().toISOString()
    });

    logger.info('Merchant profile updated', { merchantId, updatedFields: Object.keys(updateData) });
    return merchant;
  },

  async updateBusinessHours(merchantId, businessHours) {
    const merchant = await this.getProfile(merchantId);
    await merchant.update({ business_hours: businessHours });

    EventManager.emit(MERCHANT_PROFILE_UPDATE_EVENTS.BUSINESS_HOURS_UPDATED, {
      merchantId,
      businessHours,
      timestamp: new Date().toISOString()
    });

    logger.info('Merchant business hours updated', { merchantId });
    return merchant;
  },

  async updateDeliverySettings(merchantId, deliverySettings) {
    const merchant = await this.getProfile(merchantId);
    await merchant.update({ delivery_settings: deliverySettings });

    EventManager.emit(MERCHANT_PROFILE_UPDATE_EVENTS.DELIVERY_SETTINGS_UPDATED, {
      merchantId,
      deliverySettings,
      timestamp: new Date().toISOString()
    });

    logger.info('Merchant delivery settings updated', { merchantId });
    return merchant;
  },

  async createBranch(merchantId, branchData) {
    const merchant = await this.getProfile(merchantId);
    const branch = await MerchantBranch.create({
      ...branchData,
      merchant_id: merchantId
    });

    await SecurityAuditLogger.logSecurityAudit('MERCHANT_BRANCH_CREATED', {
      userId: merchant.user_id,
      merchantId,
      branchId: branch.id,
      severity: 'info',
      metadata: { branchData }
    });

    EventManager.emit(MERCHANT_PROFILE_UPDATE_EVENTS.BRANCH_CREATED, {
      merchantId,
      branchId: branch.id,
      branchData,
      timestamp: new Date().toISOString()
    });

    logger.info('Merchant branch created', { merchantId, branchId: branch.id });
    return branch;
  },

  async updateBranch(merchantId, branchId, updateData) {
    const merchant = await this.getProfile(merchantId);
    const branch = await MerchantBranch.findOne({
      where: { id: branchId, merchant_id: merchantId }
    });

    if (!branch) {
      throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
    }

    await branch.update(updateData);

    EventManager.emit(MERCHANT_PROFILE_UPDATE_EVENTS.BRANCH_UPDATED, {
      merchantId,
      branchId,
      updatedData: updateData,
      timestamp: new Date().toISOString()
    });

    logger.info('Merchant branch updated', { merchantId, branchId });
    return branch;
  }
};

module.exports = merchantProfileService;