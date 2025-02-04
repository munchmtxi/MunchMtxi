const express = require('express');
const passwordController = require('@controllers/passwordController');
const passwordValidators = require('@validators/passwordValidators');
const rateLimit = require('express-rate-limit');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Password Management
 *   description: Endpoints for managing passwords
 */

// Rate limiter for password routes
const passwordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many password reset attempts from this IP, please try again later.',
});

/**
 * @swagger
 * /password/forgot-password:
 *   post:
 *     summary: Request a password reset token
 *     tags: [Password Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *             required:
 *               - email
 *     responses:
 *       200:
 *         description: Password reset token sent successfully
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
 *                   example: "Token sent to email!"
 *                 data:
 *                   type: object
 *                   properties:
 *                     resetToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Invalid email
 *       500:
 *         description: Internal server error
 */
router.post('/forgot-password', passwordLimiter, validateForgotPassword, forgotPassword);

/**
 * @swagger
 * /password/reset-password:
 *   post:
 *     summary: Reset a user's password using a token
 *     tags: [Password Management]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               token:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *               newPassword:
 *                 type: string
 *                 example: NewPassword123!
 *             required:
 *               - token
 *               - newPassword
 *     responses:
 *       200:
 *         description: Password reset successful
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
 *                   example: "Password reset successful!"
 *       400:
 *         description: Invalid token or input
 *       500:
 *         description: Internal server error
 */
router.post('/reset-password', passwordLimiter, validateResetPassword, resetPassword);

module.exports = router;