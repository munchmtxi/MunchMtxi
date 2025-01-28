// src/routes/2faRoutes.js
const express = require('express');
const { setup2FA, verify2FA } = require('../controllers/2faController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate2FASetup, validate2FAVerify } = require('../validators/2faValidators');

const router = express.Router();

router.use(authenticate);

router.post('/setup', validate2FASetup, setup2FA);
router.post('/verify', validate2FAVerify, verify2FA);

module.exports = router;
