// src/controllers/merchant/profile/merchant2FAController.js
'use strict';
const merchant2FAService = require('@services/merchant/profile/merchant2FAService');
const catchAsync = require('@utils/catchAsync');
const { logger } = require('@utils/logger');

const merchant2FAController = {
  setup2FA: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId; // Fix: Use merchantId, not id
    const { method } = req.body;
    logger.info('Initiating 2FA setup', { merchantId, method });
    const result = await merchant2FAService.setup2FA(merchantId, method);
    res.status(200).json({ status: 'success', data: result });
  }),

  enable2FA: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId; // Fix: Use merchantId
    const { token, method } = req.body;
    logger.info('Enabling 2FA', { merchantId, method });
    const result = await merchant2FAService.enable2FA(merchantId, token, method);
    res.status(200).json({ status: 'success', data: result });
  }),

  verify2FA: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId; // Fix: Use merchantId
    const { token, method } = req.body;
    logger.info('Verifying 2FA', { merchantId, method });
    const isValid = await merchant2FAService.verify2FA(merchantId, token, method);
    res.status(200).json({ status: 'success', data: { verified: isValid } });
  }),

  disable2FA: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId; // Fix: Use merchantId
    const { token } = req.body;
    logger.info('Disabling 2FA', { merchantId });
    const result = await merchant2FAService.disable2FA(merchantId, token);
    res.status(200).json({ status: 'success', data: result });
  }),

  updatePreferredMethod: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId; // Fix: Use merchantId
    const { newMethod, token } = req.body;
    logger.info('Updating 2FA method', { merchantId, newMethod });
    const result = await merchant2FAService.updatePreferredMethod(merchantId, newMethod, token);
    res.status(200).json({ status: 'success', data: result });
  }),

  generateNewBackupCodes: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId; // Fix: Use merchantId
    const { token } = req.body;
    logger.info('Generating new backup codes', { merchantId });
    const result = await merchant2FAService.generateNewBackupCodes(merchantId, token);
    res.status(200).json({ status: 'success', data: result });
  }),
};

module.exports = merchant2FAController;