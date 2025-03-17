// src/routes/merchant/branch/branchProfileSecurityRoutes.js
'use strict';
const express = require('express');
const router = express.Router();
const branchProfileSecurityController = require('@controllers/merchant/branch/branchProfileSecurityController');
const {
  secureBranchProfile,
  verifySecureBranchOwnership,
  hasSecureBranchPermission,
  enforce2FA,
  validatePasswordUpdate,
  rateLimitBranchAction,
  validate2FAConfig,
} = require('@middleware/branchProfileSecurityMiddleware');
const { logger } = require('@utils/logger');

// Secure branch profile routes
router.patch(
  '/:branchId/update-password',
  secureBranchProfile,
  verifySecureBranchOwnership,
  hasSecureBranchPermission('update_password'),
  enforce2FA,
  validatePasswordUpdate,
  rateLimitBranchAction,
  branchProfileSecurityController.updatePassword
);

router.post(
  '/:branchId/configure-2fa',
  secureBranchProfile,
  verifySecureBranchOwnership,
  hasSecureBranchPermission('configure_2fa'),
  validate2FAConfig,
  rateLimitBranchAction,
  branchProfileSecurityController.configure2FA
);

router.post(
  '/:branchId/enable-2fa',
  secureBranchProfile,
  verifySecureBranchOwnership,
  hasSecureBranchPermission('configure_2fa'),
  rateLimitBranchAction,
  branchProfileSecurityController.enable2FA
);

router.post(
  '/:branchId/verify-2fa',
  secureBranchProfile,
  verifySecureBranchOwnership,
  hasSecureBranchPermission('verify_2fa'),
  rateLimitBranchAction,
  branchProfileSecurityController.verify2FA
);

router.post(
  '/:branchId/disable-2fa',
  secureBranchProfile,
  verifySecureBranchOwnership,
  hasSecureBranchPermission('configure_2fa'),
  enforce2FA,
  rateLimitBranchAction,
  branchProfileSecurityController.disable2FA
);

router.post(
  '/:branchId/regenerate-backup-codes',
  secureBranchProfile,
  verifySecureBranchOwnership,
  hasSecureBranchPermission('configure_2fa'),
  enforce2FA,
  rateLimitBranchAction,
  branchProfileSecurityController.regenerateBackupCodes
);

module.exports = router;