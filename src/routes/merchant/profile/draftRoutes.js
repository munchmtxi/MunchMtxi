// src/routes/merchant/profile/draftRoutes.js
'use strict';

const express = require('express');
const DraftController = require('@controllers/merchant/profile/draftController');
const { protectDraft, restrictToDraftOwner } = require('@middleware/draftMiddleware'); // To be created
const { logger } = require('@utils/logger');

const router = express.Router({ mergeParams: true }); // mergeParams to inherit merchantId if needed

// Base route: /api/v1/merchants/profile/drafts

/**
 * @route POST /drafts
 * @desc Create or update a merchant draft
 * @access Private (Merchant only)
 */
router.post(
  '/',
  protectDraft,        // Authenticate and attach user/merchant info
  restrictToDraftOwner, // Ensure user owns the draft
  async (req, res, next) => {
    logger.info('POST /drafts request received', {
      merchantId: req.user?.merchantId,
      userId: req.user?.id
    });
    await DraftController.createOrUpdateDraft(req, res, next);
  }
);

/**
 * @route GET /drafts
 * @desc Retrieve the active merchant draft
 * @access Private (Merchant only)
 */
router.get(
  '/',
  protectDraft,
  restrictToDraftOwner,
  async (req, res, next) => {
    logger.info('GET /drafts request received', {
      merchantId: req.user?.merchantId,
      userId: req.user?.id
    });
    await DraftController.getDraft(req, res, next);
  }
);

/**
 * @route POST /drafts/submit
 * @desc Submit the merchant draft for review
 * @access Private (Merchant only)
 */
router.post(
  '/submit',
  protectDraft,
  restrictToDraftOwner,
  async (req, res, next) => {
    logger.info('POST /drafts/submit request received', {
      merchantId: req.user?.merchantId,
      userId: req.user?.id
    });
    await DraftController.submitDraft(req, res, next);
  }
);

module.exports = router;