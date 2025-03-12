const Sequelize = require('sequelize');
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
    const isBlacklisted = await TokenService.isTokenBlacklisted(authToken);
    if (isBlacklisted) {
      throw new AppError('Session expired', 401, 'TOKEN_BLACKLISTED');
    }

    const merchant = await this.getProfile(merchantId);

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
      const isValid = merchant.validateBusinessTypeDetails?.call({ ...merchant.dataValues, business_type_details: details });
      if (!isValid) {
        throw new AppError('Invalid business type details', 400, 'INVALID_BUSINESS_TYPE_DETAILS');
      }
      updateData.business_type_details = details;
    }

    await merchant.update(updateData);

    logger.info('Merchant profile updated', { merchantId, updatedFields: Object.keys(updateData) });
    return merchant;
  },

  async updateBusinessHours(merchantId, businessHours) {
    const merchant = await this.getProfile(merchantId);
    await merchant.update({ business_hours: businessHours });

    logger.info('Merchant business hours updated', { merchantId });
    return merchant;
  },

  async updateDeliverySettings(merchantId, deliverySettings) {
    const merchant = await this.getProfile(merchantId);
    await merchant.update({ delivery_settings: deliverySettings });

    logger.info('Merchant delivery settings updated', { merchantId });
    return merchant;
  },

  async createBranch(merchantId, branchData) {
    const { location } = branchData;
    const geoJson = {
      type: 'Point',
      coordinates: [location.lng, location.lat], // Assumes { lat, lng } input
    };
    logger.debug('Creating branch with GeoJSON:', JSON.stringify(geoJson));
  
    const branchPayload = {
      merchant_id: merchantId,
      name: branchData.name,
      branch_code: branchData.branch_code || `BR${Date.now().toString().slice(-6)}`,
      contact_email: branchData.contact_email,
      contact_phone: branchData.contact_phone,
      address: branchData.address,
      location: Sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(geoJson)),
      operating_hours: branchData.operating_hours || {}, // Expect { day: { open, close } }
      payment_methods: branchData.payment_methods || [],
      media: branchData.media || { logo: null, banner: null, gallery: [] },
      is_active: branchData.is_active !== undefined ? branchData.is_active : true,
    };
  
    try {
      const branch = await MerchantBranch.create(branchPayload);
      logger.info('Merchant branch created', { merchantId, branchId: branch.id });
      return branch;
    } catch (error) {
      logger.error('Branch creation failed:', error);
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new AppError('Branch code already exists', 400, 'DUPLICATE_BRANCH_CODE', { field: 'branch_code' });
      }
      throw error;
    }
  }, // Added comma here

  async updateBranch(merchantId, branchId, updateData) {
    const merchant = await this.getProfile(merchantId);
    const branch = await MerchantBranch.findOne({
      where: { id: branchId, merchant_id: merchantId }
    });

    if (!branch) {
      throw new AppError('Branch not found', 404, 'BRANCH_NOT_FOUND');
    }

    await branch.update(updateData);

    logger.info('Merchant branch updated', { merchantId, branchId });
    return branch;
  }
};

module.exports = merchantProfileService;