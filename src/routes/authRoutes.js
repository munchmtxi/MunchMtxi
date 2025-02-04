const express = require('express');
const authController = require('@controllers/authController');
const authValidators = require('@validators/authValidators');
const rateLimit = require('express-rate-limit');
const authMiddleware = require('@middleware/authMiddleware');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Endpoints for user authentication and registration
 */

// Rate limiter for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
router.use(authLimiter);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new customer
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: John
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 example: john.doe@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *               phone:
 *                 type: string
 *                 example: "+265888123456"
 *               country:
 *                 type: string
 *                 example: malawi
 *               merchantType:
 *                 type: string
 *                 example: grocery
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - country
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     firstName:
 *                       type: string
 *                       example: John
 *                     lastName:
 *                       type: string
 *                       example: Doe
 *                     email:
 *                       type: string
 *                       example: john.doe@example.com
 *                     phone:
 *                       type: string
 *                       example: "+265888123456"
 *                     country:
 *                       type: string
 *                       example: malawi
 *                     merchantType:
 *                       type: string
 *                       example: grocery
 *                     role:
 *                       type: string
 *                       example: Customer
 *                     isVerified:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Validation error
 *       500:
 *         description: Internal server error
 */
router.post('/register', validateRegister, register);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Log in a user
 *     tags: [Authentication]
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
 *               password:
 *                 type: string
 *                 example: Password123!
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Login successful
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
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           example: 1
 *                         firstName:
 *                           type: string
 *                           example: John
 *                         lastName:
 *                           type: string
 *                           example: Doe
 *                         email:
 *                           type: string
 *                           example: john.doe@example.com
 *                         phone:
 *                           type: string
 *                           example: "+265888123456"
 *                         country:
 *                           type: string
 *                           example: malawi
 *                         merchantType:
 *                           type: string
 *                           example: grocery
 *                         role:
 *                           type: string
 *                           example: Customer
 *                         isVerified:
 *                           type: boolean
 *                           example: false
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
router.post('/login', validateLogin, login);

/**
 * @swagger
 * /auth/token:
 *   post:
 *     summary: Refresh JWT access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *             required:
 *               - refreshToken
 *     responses:
 *       200:
 *         description: Token refreshed successfully
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
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *       400:
 *         description: Invalid refresh token
 *       500:
 *         description: Internal server error
 */
router.post('/token', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many token refresh attempts from this IP, please try again later.',
}), refreshToken);

/**
 * @swagger
 * /auth/register-role:
 *   post:
 *     summary: Register a non-customer user (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [Merchant, Staff, Driver]
 *                 example: Merchant
 *               firstName:
 *                 type: string
 *                 example: Jane
 *               lastName:
 *                 type: string
 *                 example: Doe
 *               email:
 *                 type: string
 *                 example: jane.doe@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *               phone:
 *                 type: string
 *                 example: "+265888123456"
 *               country:
 *                 type: string
 *                 example: malawi
 *               merchantType:
 *                 type: string
 *                 example: grocery
 *             required:
 *               - role
 *               - firstName
 *               - lastName
 *               - email
 *               - password
 *               - country
 *     responses:
 *       201:
 *         description: Non-customer user registered successfully
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
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     firstName:
 *                       type: string
 *                       example: Jane
 *                     lastName:
 *                       type: string
 *                       example: Doe
 *                     email:
 *                       type: string
 *                       example: jane.doe@example.com
 *                     phone:
 *                       type: string
 *                       example: "+265888123456"
 *                     country:
 *                       type: string
 *                       example: malawi
 *                     merchantType:
 *                       type: string
 *                       example: grocery
 *                     role:
 *                       type: string
 *                       example: Merchant
 *                     isVerified:
 *                       type: boolean
 *                       example: false
 *       400:
 *         description: Validation error
 *       403:
 *         description: Unauthorized (only Admins can register non-customer roles)
 *       500:
 *         description: Internal server error
 */
router.post('/register-role', 
  authenticate, 
  authorizeRoles('Admin'), 
  validateRegisterNonCustomer, 
  registerNonCustomer
);

module.exports = router;