// src/controllers/merchant/profile/draftController.js
'use strict';

const MerchantDraftService = require('@services/merchant/profile/draftService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

class DraftController {
  /**
   * Creates or updates a merchant draft
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next middleware function
   */
  async createOrUpdateDraft(req, res, next) {
    try {
      const { merchantId } = req.user; // Provided by middleware
      const userId = req.user.id;
      const draftData = req.body;

      if (!draftData || Object.keys(draftData).length === 0) {
        throw new AppError('Draft data is required', 400, 'MISSING_DRAFT_DATA');
      }

      const draft = await MerchantDraftService.createOrUpdateDraft(merchantId, userId, draftData);

      logger.info('Draft creation/update request processed', {
        merchantId,
        userId,
        draftId: draft.id
      });

      res.status(200).json({
        status: 'success',
        data: {
          draft: {
            id: draft.id,
            merchant_id: draft.merchant_id,
            draft_data: draft.draft_data,
            status: draft.status,
            expires_at: draft.expires_at
          }
        }
      });
    } catch (error) {
      logger.error('Error in createOrUpdateDraft controller', {
        merchantId: req.user?.merchantId,
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Retrieves a merchant's active draft
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next middleware function
   */
  async getDraft(req, res, next) {
    try {
      const { merchantId } = req.user; // Provided by middleware

      const draft = await MerchantDraftService.getDraft(merchantId);

      if (!draft) {
        return res.status(200).json({
          status: 'success',
          data: null,
          message: 'No active draft found'
        });
      }

      logger.info('Draft retrieval request processed', {
        merchantId,
        draftId: draft.id
      });

      res.status(200).json({
        status: 'success',
        data: {
          draft: {
            id: draft.id,
            merchant_id: draft.merchant_id,
            draft_data: draft.draft_data,
            status: draft.status,
            expires_at: draft.expires_at
          }
        }
      });
    } catch (error) {
      logger.error('Error in getDraft controller', {
        merchantId: req.user?.merchantId,
        error: error.message
      });
      next(error);
    }
  }

  /**
   * Submits a merchant draft for review
   * @param {object} req - Express request object
   * @param {object} res - Express response object
   * @param {function} next - Express next middleware function
   */
  async submitDraft(req, res, next) {
    try {
      const { merchantId } = req.user; // Provided by middleware
      const userId = req.user.id;

      const draft = await MerchantDraftService.submitDraft(merchantId, userId);

      logger.info('Draft submission request processed', {
        merchantId,
        userId,
        draftId: draft.id
      });

      res.status(200).json({
        status: 'success',
        data: {
          draft: {
            id: draft.id,
            merchant_id: draft.merchant_id,
            draft_data: draft.draft_data,
            status: draft.status,
            expires_at: draft.expires_at
          }
        },
        message: 'Draft submitted for review'
      });
    } catch (error) {
      logger.error('Error in submitDraft controller', {
        merchantId: req.user?.merchantId,
        userId: req.user?.id,
        error: error.message
      });
      next(error);
    }
  }
}

module.exports = new DraftController();