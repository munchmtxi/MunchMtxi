// src/routes/merchantRoutes/profileRoutes/merchant2FARoutes.js
const express = require('express');
const router = express.Router();

// Import controller functions
const {
  setup2FA,
  enable2FA,
  verify2FA,
  disable2FA,
  updatePreferredMethod,
  generateBackupCodes
} = require('@controllers/merchantControllers/profileControllers/merchant2FAController');

const {
  validate2FASetup,
  validate2FAVerification,
  validateMethodUpdate,
  validateBackupEmail,
  validateBackupPhone
} = require('@validators/merchantValidators/profileValidators/merchant2FAValidator');

const {
  authenticate,
  hasMerchantPermission,
  checkRoleBasedRateLimit
} = require('@middleware/authMiddleware');

// Apply base middleware
router.use(authenticate);
router.use(hasMerchantPermission('profile.manage'));
router.use(checkRoleBasedRateLimit('2fa'));

// Setup and management routes
router.post('/setup', validate2FASetup, setup2FA);
router.post('/enable', validate2FAVerification, enable2FA);
router.post('/verify', validate2FAVerification, verify2FA);
router.post('/disable', validate2FAVerification, disable2FA);

// Method management
router.put('/method', validateMethodUpdate, updatePreferredMethod);

// Backup codes
router.post('/backup-codes', validate2FAVerification, generateBackupCodes);

// Remove undefined routes until they're implemented
// router.put('/backup-email', validateBackupEmail, updateBackupEmail);
// router.put('/backup-phone', validateBackupPhone, updateBackupPhone);
// router.get('/status', getStatus);
// router.get('/methods', getAvailableMethods);
// router.post('/recover', initiateRecovery);
// router.post('/recover/verify', validate2FAVerification, verifyRecovery);

module.exports = router;