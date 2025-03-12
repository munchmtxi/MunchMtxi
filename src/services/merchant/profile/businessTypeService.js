const Joi = require('joi');
const { Merchant } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const { getBusinessTypes } = require('@config/constants/businessTypes');

const { BUSINESS_TYPES } = getBusinessTypes();
logger.info('BUSINESS_TYPES contents:', BUSINESS_TYPES);

const merchantProfileService = {
  async updateBusinessType(merchantId, userId, updateData) {
    const merchant = await Merchant.findByPk(merchantId);
    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    const schema = Joi.object({
      business_type: Joi.string()
        .valid('restaurant', 'grocery', 'cafe', 'bakery', 'butcher') // Match merchant.js
        .required(),
      business_type_details: Joi.object({
        cuisine_type: Joi.array().items(Joi.string()).optional(),
        seating_capacity: Joi.number().integer().min(1).optional(),
        service_types: Joi.array()
          .items(Joi.string().valid('dine_in', 'takeaway', 'delivery', 'catering'))
          .optional(),
      }).optional(),
    });

    const { error, value } = schema.validate(updateData, { abortEarly: false });
    if (error) {
      logger.error('Validation error:', error.details);
      throw new AppError('Invalid business type data', 400, 'VALIDATION_ERROR', error.details);
    }

    const businessType = value.business_type.toLowerCase();
    if (value.business_type_details?.service_types) {
      const validTypes = BUSINESS_TYPES[businessType.toUpperCase()]?.allowedServiceTypes || [];
      logger.debug('Validating service_types:', { businessType, value: value.business_type_details.service_types });
      if (!value.business_type_details.service_types.every(type => validTypes.includes(type))) {
        throw new AppError('Invalid service type for business', 400, 'INVALID_SERVICE_TYPE');
      }
    }

    const previousState = {
      business_type: merchant.business_type,
      business_type_details: merchant.business_type_details,
    };

    const updatedMerchant = await merchant.update({
      business_type: businessType,
      business_type_details: value.business_type_details || merchant.business_type_details,
    });

    logger.info('Merchant business type updated', { merchantId, previous: previousState, updated: updatedMerchant });
    return updatedMerchant;
  },

  async getBusinessTypeRequirements(businessType) {
    const typeConfig = BUSINESS_TYPES[businessType.toUpperCase()];
    if (!typeConfig) {
      throw new AppError('Invalid business type', 400, 'INVALID_BUSINESS_TYPE');
    }
    return typeConfig;
  }
};

module.exports = merchantProfileService;