const express = require('express');
const { 
  register, 
  login, 
  refreshToken, 
  registerNonCustomer,
  merchantLogin // Add this
} = require('@controllers/authController');
const { 
  validateRegister, 
  validateLogin,
  validateRegisterNonCustomer,
  validateMerchantLogin // Add this
} = require('@validators/authValidators');
const rateLimit = require('express-rate-limit');
const { 
  authenticate, 
  authorizeRoles 
} = require('@middleware/authMiddleware');
const { validateMerchantLogout } = require('@validators/authValidators');
const { logout } = require('@controllers/authController');

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

/**
 * @swagger
 * /auth/merchant/login:
 *   post:
 *     summary: Log in a merchant
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
 *                 example: merchant@example.com
 *               password:
 *                 type: string
 *                 example: Password123!
 *             required:
 *               - email
 *               - password
 *     responses:
 *       200:
 *         description: Merchant login successful
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
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         merchant:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             business_name:
 *                               type: string
 *                             business_type:
 *                               type: string
 *                             phone_number:
 *                               type: string
 *                             currency:
 *                               type: string
 *                             time_zone:
 *                               type: string
 *                     token:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account not verified
 */
router.post(
  '/merchant/login',
  validateMerchantLogin,
  authLimiter,
  merchantLogin
);

/**
 * @swagger
 * /auth/merchant/logout:
 *   post:
 *     summary: Logout merchant
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: string
 *                 description: Optional device ID for "Remember Me" cleanup
 *     responses:
 *       200:
 *         description: Successfully logged out
 *       401:
 *         description: Unauthorized
 */
/**
 * @swagger
 * /auth/merchant/logout:
 *   post:
 *     summary: Logout merchant and invalidate sessions
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               deviceId:
 *                 type: string
 *                 format: uuid
 *                 description: Device ID for "Remember Me" token cleanup
 *               clearAllDevices:
 *                 type: boolean
 *                 description: Whether to logout from all devices
 *                 default: false
 *             example:
 *               deviceId: "123e4567-e89b-12d3-a456-426614174000"
 *               clearAllDevices: false
 *     responses:
 *       200:
 *         description: Successfully logged out
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
 *                   example: Successfully logged out
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - Invalid or expired token
 *       403:
 *         description: Forbidden - Not a merchant account
 *       500:
 *         description: Internal server error
 */
router.post(
  '/merchant/logout',
  authenticate,
  authorizeRoles('Merchant'),
  validateMerchantLogout,
  logout
);

module.exports = router;