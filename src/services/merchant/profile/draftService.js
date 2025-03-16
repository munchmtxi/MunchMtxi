// src/services/merchant/profile/draftService.js
'use strict';

const { MerchantDraft, Merchant } = require('@models');
const AppError = require('@utils/AppError');
const TokenService = require('@services/common/tokenService');
const { logger } = require('@utils/logger');
const { Op } = require('sequelize');

class MerchantDraftService {
  /**
   * Creates or updates a merchant draft
   * @param {number} merchantId - The ID of the merchant
   * @param {number} userId - The ID of the user making the update
   * @param {object} draftData - The draft data to save
   * @returns {Promise<MerchantDraft>} - The created or updated draft
   */
  async createOrUpdateDraft(merchantId, userId, draftData) {
    try {
      // Verify token hasn't been blacklisted
      const isBlacklisted = await TokenService.isTokenBlacklisted(userId);
      if (isBlacklisted) {
        throw new AppError('Session expired', 401, 'TOKEN_BLACKLISTED');
      }

      // Check if merchant exists
      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      // Validate draft data against allowed fields (optional, could be moved to controller)
      const allowedFields = [
        'business_name', 'address', 'phone_number', 'currency',
        'time_zone', 'business_hours', 'notification_preferences',
        'whatsapp_enabled', 'service_radius', 'location'
      ];
      const invalidFields = Object.keys(draftData).filter(key => !allowedFields.includes(key));
      if (invalidFields.length > 0) {
        throw new AppError(`Invalid fields in draft: ${invalidFields.join(', ')}`, 400, 'INVALID_DRAFT_FIELDS');
      }

      // Find existing draft or create new one
      const [draft, created] = await MerchantDraft.findOrCreate({
        where: { 
          merchant_id: merchantId,
          status: 'draft'
        },
        defaults: {
          draft_data: draftData,
          updated_by: userId,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours expiry
        }
      });

      if (!created) {
        draft.draft_data = { ...draft.draft_data, ...draftData };
        draft.updated_by = userId;
        draft.expires_at = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await draft.save();
      }

      logger.info('Merchant draft created/updated', {
        merchantId,
        userId,
        draftId: draft.id,
        created
      });

      return draft;
    } catch (error) {
      logger.error('Error in createOrUpdateDraft', {
        merchantId,
        userId,
        error: error.message
      });
      throw error instanceof AppError ? error : new AppError('Failed to create/update draft', 500);
    }
  }

  /**
   * Retrieves an active draft for a merchant
   * @param {number} merchantId - The ID of the merchant
   * @returns {Promise<MerchantDraft|null>} - The draft if found, null otherwise
   */
  async getDraft(merchantId) {
    try {
      const draft = await MerchantDraft.findOne({
        where: {
          merchant_id: merchantId,
          status: 'draft',
          expires_at: {
            [Op.gt]: new Date()
          }
        }
      });

      if (!draft) {
        logger.info('No active draft found', { merchantId });
        return null;
      }

      logger.info('Draft retrieved', { merchantId, draftId: draft.id });
      return draft;
    } catch (error) {
      logger.error('Error in getDraft', { merchantId, error: error.message });
      throw new AppError('Failed to retrieve draft', 500);
    }
  }

  /**
   * Submits a draft for review
   * @param {number} merchantId - The ID of the merchant
   * @param {number} userId - The ID of the user submitting the draft
   * @returns {Promise<MerchantDraft>} - The submitted draft
   */
  async submitDraft(merchantId, userId) {
    try {
      const draft = await this.getDraft(merchantId);
      if (!draft) {
        throw new AppError('No active draft found', 404, 'DRAFT_NOT_FOUND');
      }

      draft.status = 'pending_review';
      await draft.save();

      logger.info('Draft submitted for review', {
        merchantId,
        userId,
        draftId: draft.id
      });

      return draft;
    } catch (error) {
      logger.error('Error in submitDraft', {
        merchantId,
        userId,
        error: error.message
      });
      throw error instanceof AppError ? error : new AppError('Failed to submit draft', 500);
    }
  }
}

module.exports = new MerchantDraftService();