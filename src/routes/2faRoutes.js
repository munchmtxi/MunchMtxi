const express = require('express');
const { setup2FA, verify2FA } = require('../controllers/2faController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate2FASetup, validate2FAVerify } = require('../validators/2faValidators');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Two-Factor Authentication
 *   description: Endpoints for managing two-factor authentication (2FA)
 */

router.use(authenticate);

/**
 * @swagger
 * /2fa/setup:
 *   post:
 *     summary: Set up two-factor authentication for the user
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 2FA setup successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     qrCode:
 *                       type: string
 *                       example: "data:image/png;base64,..."
 *                     secret:
 *                       type: string
 *                       example: "JBSWY3DPEHPK3PXP"
 *       400:
 *         description: Invalid input or 2FA already set up
 *       500:
 *         description: Internal server error
 */
router.post('/setup', validate2FASetup, setup2FA);

/**
 * @swagger
 * /2fa/verify:
 *   post:
 *     summary: Verify a two-factor authentication token
 *     tags: [Two-Factor Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 description: The 2FA token provided by the user
 *             required:
 *               - token
 *     responses:
 *       200:
 *         description: Token verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: "2FA verification successful"
 *       400:
 *         description: Invalid token or input
 *       500:
 *         description: Internal server error
 */
router.post('/verify', validate2FAVerify, verify2FA);

module.exports = router;