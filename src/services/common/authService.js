/**
 * @module services/common/authService
 * @description Service for handling authentication-related operations, including user registration,
 * login, token generation, and merchant-specific authentication.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AppError = require('@utils/AppError');
const jwtConfig = require('@config/jwtConfig');
const { logger } = require('@utils/logger');

logger.info('File loaded: authService.js');

// Dynamic require to fetch models at runtime
const getModels = () => require('@models');

/**
 * TokenService handles JWT token generation, storage, and invalidation.
 */
const TokenService = {
  /**
 * Generates access and refresh tokens for a user.
 * @param {Object} user - User object containing `id`, `role_id`, and optionally `merchant_profile`.
 * @param {String} deviceId - Unique identifier for the user's device.
 * @returns {Object} - Object containing `accessToken` and `refreshToken`.
 */
generateTokens: async (user, deviceId) => {
  const { Device } = getModels();
  
  // Prepare token payload
  const payload = { 
    id: user.id, 
    role: user.role_id 
  };
  if (user.role_id === 19 && user.merchant_profile) { // Merchant role
    payload.merchant_id = user.merchant_profile.id;
  }

  const accessToken = jwt.sign(
    payload,
    jwtConfig.secretOrKey,
    { expiresIn: jwtConfig.expiresIn, algorithm: jwtConfig.algorithm }
  );
  const refreshToken = jwt.sign(
    { id: user.id, role: user.role_id }, // Refresh token doesn’t need merchant_id
    jwtConfig.refreshSecret,
    { expiresIn: jwtConfig.refreshExpiresIn, algorithm: jwtConfig.algorithm }
  );

  await Device.update(
    {
      refresh_token: refreshToken,
      refresh_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
    { where: { user_id: user.id, device_id: deviceId } }
  );

  logger.info('Tokens generated', { userId: user.id, merchantId: payload.merchant_id || null });
  return { accessToken, refreshToken };
},

  /**
   * Generates a remember-me token for persistent sessions.
   * @param {Number} userId - User ID.
   * @param {String} deviceId - Unique identifier for the user's device.
   * @returns {Object} - Object containing `rememberToken` and `expiresAt`.
   */
  generateRememberToken: async (userId, deviceId) => {
    const { Device } = getModels();
    const rememberToken = `${userId}-${deviceId}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await Device.update(
      {
        remember_token: rememberToken,
        remember_token_expires_at: expiresAt,
      },
      { where: { user_id: userId, device_id: deviceId } }
    );
    return { rememberToken, expiresAt };
  },

  /**
   * Invalidates tokens for a specific device.
   * @param {Number} userId - User ID.
   * @param {String} deviceId - Unique identifier for the user's device.
   */
  logoutUser: async (userId, deviceId) => {
    const { Device } = getModels();
    await Device.update(
      {
        refresh_token: null,
        refresh_token_expires_at: null,
        remember_token: null,
        remember_token_expires_at: null,
      },
      { where: { user_id: userId, device_id: deviceId } }
    );
    logger.info('User tokens invalidated', { userId, deviceId });
  },

  /**
   * Clears all remember-me tokens for a user.
   * @param {Number} userId - User ID.
   */
  clearAllRememberTokens: async (userId) => {
    const { Device } = getModels();
    await Device.update(
      {
        remember_token: null,
        remember_token_expires_at: null,
        refresh_token: null,
        refresh_token_expires_at: null,
      },
      { where: { user_id: userId } }
    );
    logger.info('All tokens cleared for user', { userId });
  },

  /**
   * Clears a specific remember-me token for a device.
   * @param {Number} userId - User ID.
   * @param {String} deviceId - Unique identifier for the user's device.
   */
  clearRememberToken: async (userId, deviceId) => {
    const { Device } = getModels();
    await Device.update(
      {
        remember_token: null,
        remember_token_expires_at: null,
      },
      { where: { user_id: userId, device_id: deviceId } }
    );
    logger.info('Remember token cleared', { userId, deviceId });
  },
};

/**
 * Registers a new user.
 * @param {Object} userData - User details.
 * @returns {Object} - Created user.
 */
const registerUser = async (userData) => {
  try {
    const { firstName, lastName, email, password, phone, country, merchantType, role } = userData;
    const hashedPassword = await bcrypt.hash(password, 10);
    const { User } = getModels();
    const user = await User.create({
      first_name: firstName,
      last_name: lastName,
      email,
      password: hashedPassword,
      phone,
      country,
      merchant_type: merchantType,
      role_id: role === 'Merchant' ? 19 : null, // Adjust based on Role table
    });
    return user;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Email or phone number already in use', 400);
    }
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map((e) => e.message).join('. ');
      throw new AppError(`Validation Error: ${messages}`, 400);
    }
    throw new AppError('Failed to register user', 500);
  }
};

/**
 * Logs in a user.
 * @param {String} email - User's email.
 * @param {String} password - User's password.
 * @returns {Object} - User and JWT tokens.
 */
const loginUser = async (email, password) => {
  try {
    const { User } = getModels();
    const user = await User.scope(null).findOne({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (user.status !== 'active') {
      throw new AppError('User account is inactive', 403);
    }
    const { accessToken, refreshToken } = await TokenService.generateTokens(user, null); // No deviceId for general login
    return { user, accessToken, refreshToken };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to login', 500);
  }
};

/**
 * Logs in a merchant with device tracking and optional remember-me functionality.
 * @param {String} email - Merchant's email.
 * @param {String} password - Merchant's password.
 * @param {Object} deviceInfo - Device details (`deviceId`, `deviceType`).
 * @param {Boolean} rememberMe - Whether to generate a remember token.
 * @returns {Object} - User, tokens, and optional remember token data.
 */
const loginMerchant = async (email, password, deviceInfo, rememberMe = false) => {
  try {
    const { User, Merchant, Device } = getModels(); // Fetch models at runtime
    logger.info('Attempting merchant login', { email, deviceInfo, rememberMe });

    await User.sequelize.authenticate();
    logger.info('DB connection successful');

    logger.info('Merchant login: Before DB test', { email });

    const user = await User.scope(null).findOne({
      where: { email, role_id: 19 },
      include: [{ model: Merchant, as: 'merchant_profile', required: true }],
      timeout: 5000,
    }).catch((err) => {
      logger.error('User query failed', { error: err.message });
      throw new AppError('Database query timeout', 500);
    });

    if (!user) {
      logger.warn('User not found or not a merchant', { email });
      throw new AppError('Invalid merchant credentials', 401);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      logger.warn('Password mismatch', { email });
      throw new AppError('Invalid merchant credentials', 401);
    }

    if (!user.is_verified) {
      logger.warn('User not verified', { email });
      throw new AppError('Please verify your account first', 403);
    }

    if (user.status !== 'active') {
      logger.warn('User account inactive', { email });
      throw new AppError('User account is inactive', 403);
    }

    logger.info('Generating tokens', { userId: user.id });
    const { accessToken, refreshToken } = await TokenService.generateTokens(user, deviceInfo.deviceId);

    const [device, created] = await Device.findOrCreate({
      where: { user_id: user.id, device_id: deviceInfo.deviceId },
      defaults: {
        user_id: user.id,
        device_id: deviceInfo.deviceId,
        device_type: deviceInfo.deviceType,
        platform: 'web',
        last_active_at: new Date(),
      },
    });

    let rememberTokenData = null;
    if (rememberMe) {
      rememberTokenData = await TokenService.generateRememberToken(user.id, deviceInfo.deviceId);
    } else {
      await device.update({ last_active_at: new Date() });
    }

    logger.info('Merchant login successful', { userId: user.id });
    return {
      user: { ...user.toJSON(), merchant: user.merchant_profile },
      accessToken,
      refreshToken,
      rememberToken: rememberTokenData?.rememberToken,
      rememberTokenExpiry: rememberTokenData?.expiresAt,
    };
  } catch (error) {
    logger.error('Login merchant failed', { error: error.message, stack: error.stack });
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to login merchant', 500);
  }
};

/**
 * Logs out a merchant, optionally clearing specific or all device sessions.
 * @param {Number} userId - Merchant's user ID.
 * @param {String|null} deviceId - Specific device ID to clear (optional).
 * @param {Boolean} clearAllDevices - Whether to clear all devices (optional).
 */
const logoutMerchant = async (userId, deviceId = null, clearAllDevices = false) => {
  try {
    const { Device } = getModels();
    if (clearAllDevices) {
      await TokenService.clearAllRememberTokens(userId);
      logger.info('All devices cleared for user', { userId });
    } else if (deviceId) {
      const device = await Device.findOne({ where: { user_id: userId, device_id: deviceId } });
      if (device) {
        await TokenService.logoutUser(userId, deviceId);
        logger.info('Device-specific logout successful', { userId, deviceId });
      } else {
        logger.warn('No matching device found, proceeding with logout', { userId, deviceId });
        // Still succeeds—no error thrown
      }
    } else {
      logger.info('No deviceId provided, logout without device action', { userId });
      // Succeed without device action
    }
    logger.info('Merchant logout successful', { userId, deviceId, clearAllDevices });
  } catch (error) {
    logger.error('Logout merchant failed', { error: error.message, stack: error.stack });
    throw new AppError('Failed to logout merchant', 500);
  }
};

module.exports = {
  registerUser,
  loginUser,
  generateToken: (payload, expiresIn = jwtConfig.expiresIn) =>
    jwt.sign(payload, jwtConfig.secretOrKey, { expiresIn, algorithm: jwtConfig.algorithm }),
  verifyToken: (token) => jwt.verify(token, jwtConfig.secretOrKey),
  generateRefreshToken: (payload) =>
    jwt.sign(payload, jwtConfig.refreshSecret, { expiresIn: jwtConfig.refreshExpiresIn, algorithm: jwtConfig.algorithm }),
  verifyRefreshToken: (token) => jwt.verify(token, jwtConfig.refreshSecret),
  loginMerchant,
  logoutMerchant,
};