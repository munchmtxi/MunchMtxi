// src/routes/merchant/profile/merchant2FARoutes.js
'use strict';
const express = require('express');
const router = express.Router();
const merchant2FAController = require('@controllers/merchant/profile/merchant2FAController');
const merchant2FAMiddleware = require('@middleware/merchant2FAMiddleware');
const { validate2FASetup, validate2FAVerify } = require('@validators/2faValidators');

router.post('/setup', validate2FASetup, merchant2FAMiddleware, merchant2FAController.setup2FA);
router.post('/enable', validate2FAVerify, merchant2FAMiddleware, merchant2FAController.enable2FA);
router.post('/verify', validate2FAVerify, merchant2FAMiddleware, merchant2FAController.verify2FA);
router.post('/disable', validate2FAVerify, merchant2FAMiddleware, merchant2FAController.disable2FA);
router.put('/method', validate2FAVerify, merchant2FAMiddleware, merchant2FAController.updatePreferredMethod);
router.post('/backup-codes', validate2FAVerify, merchant2FAMiddleware, merchant2FAController.generateNewBackupCodes);

module.exports = router;