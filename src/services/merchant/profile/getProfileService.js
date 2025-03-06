// src/services/merchant/profile/getProfileService.js
'use strict';

const { Merchant, User } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class GetProfileService {
  async execute(merchantId) {
    try {
      const profile = await Merchant.findOne({
        where: { id: merchantId },
        include: [{
          model: User,
          as: 'user',
          attributes: ['email', 'phone', 'first_name', 'last_name', 'country'], // Updated 'phone_number' to 'phone'
        }],
        attributes: {
          exclude: ['deleted_at'],
        },
      });

      if (!profile) {
        throw new AppError('Merchant profile not found', 404, 'MERCHANT_NOT_FOUND');
      }

      const profileData = {
        ...profile.toJSON(),
        business_hours: profile.format_business_hours(),
        whatsapp_number: profile.format_phone_for_whatsapp(),
      };

      return profileData;
    } catch (error) {
      logger.error('Error in GetProfileService:', {
        merchantId,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
}

module.exports = new GetProfileService();