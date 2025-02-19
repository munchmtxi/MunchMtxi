// src/services/merchantServices/profileServices/profileService.js
const { Merchant, User } = require('@models');
const AppError = require('@utils/AppError');
const securityAuditLogger = require('@services/securityAuditLogger');
const TokenService = require('@services/tokenService');

class MerchantProfileService {
  async updateProfile(merchantId, updateData, authToken) {
    // Verify token is still valid
    const isBlacklisted = await TokenService.isTokenBlacklisted(merchantId);
    if (isBlacklisted) {
      throw new AppError('Session expired', 401, 'TOKEN_BLACKLISTED');
    }

    const merchant = await Merchant.findByPk(merchantId, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['email']
      }]
    });

    if (!merchant) {
      throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    }

    // Log the update attempt with enhanced security audit
    await securityAuditLogger.logSecurityAudit('MERCHANT_PROFILE_UPDATE', {
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

    // If phone number is being updated, verify it's not already in use
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

    // Update the merchant profile
    await merchant.update(updateData);

    return merchant;
  }
}

module.exports = new MerchantProfileService();