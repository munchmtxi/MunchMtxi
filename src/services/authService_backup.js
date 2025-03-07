// src/services/common/authService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Merchant, Device } = require('@models');
const AppError = require('@utils/AppError');
const jwtConfig = require('@config/jwtConfig'); // Use centralized JWT config
const { logger } = require('@utils/logger');

// Fully implemented TokenService using Device model
const TokenService = {
  generateTokens: async (user, deviceId) => {
    const accessToken = jwt.sign(
      { id: user.id, role: user.role_id },
      jwtConfig.secretOrKey,
      { expiresIn: jwtConfig.expiresIn, algorithm: jwtConfig.algorithm }
    );
    const refreshToken = jwt.sign(
      { id: user.id, role: user.role_id },
      jwtConfig.refreshSecret,
      { expiresIn: jwtConfig.refreshExpiresIn, algorithm: jwtConfig.algorithm }
    );

    // Store refresh token in Device
    await Device.update(
      {
        refresh_token: refreshToken,
        refresh_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
      { where: { user_id: user.id, device_id: deviceId } }
    );

    return { accessToken, refreshToken };
  },
  generateRememberToken: async (userId, deviceId) => {
    const rememberToken = `${userId}-${deviceId}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Store remember token in Device
    await Device.update(
      {
        remember_token: rememberToken,
        remember_token_expires_at: expiresAt,
      },
      { where: { user_id: userId, device_id: deviceId } }
    );

    return { rememberToken, expiresAt };
  },
  logoutUser: async (userId, deviceId) => {
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
  clearAllRememberTokens: async (userId) => {
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
  clearRememberToken: async (userId, deviceId) => {
    await Device.update(
      {
        remember_token: null,
        remember_token_expires_at: null,
      },
      { where: { user_id: userId, device_id: deviceId } }
    );
    logger.info('Remember token cleared', { userId, deviceId });
  }
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
    const user = await User.create({
      first_name: firstName,
      last_name: lastName,
      email,
      password: hashedPassword,
      phone,
      country,
      merchant_type: merchantType,
      role_id: role === 'Merchant' ? 19 : null // Adjust based on Role table
    });
    return user;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new AppError('Email or phone number already in use', 400);
    }
    if (error.name === 'SequelizeValidationError') {
      const messages = error.errors.map(e => e.message).join('. ');
      throw new AppError(`Validation Error: ${messages}`, 400);
    }
    throw new AppError('Failed to register user', 500);
  }
};

/**
 * Logs in a user.
 * @param {String} email - User's email.
 * @param {String} password - User's password.
 * @returns {Object} - User and JWT token.
 */
const loginUser = async (email, password) => {
  try {
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
 * Generates a new JWT access token.
 * @param {Object} payload - Payload containing user ID and role.
 * @param {String} [expiresIn] - Token expiration time.
 * @returns {String} - JWT token.
 */
const generateToken = (payload, expiresIn = jwtConfig.expiresIn) => {
  return jwt.sign(payload, jwtConfig.secretOrKey, { 
    expiresIn, 
    algorithm: jwtConfig.algorithm 
  });
};

/**
 * Verifies a JWT token.
 * @param {String} token - JWT token.
 * @returns {Object} - Decoded payload.
 */
const verifyToken = (token) => {
  return jwt.verify(token, jwtConfig.secretOrKey);
};

/**
 * Generates a new JWT refresh token.
 * @param {Object} payload - Payload containing user ID and role.
 * @returns {String} - JWT refresh token.
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, jwtConfig.refreshSecret, {
    expiresIn: jwtConfig.refreshExpiresIn,
    algorithm: jwtConfig.algorithm
  });
};

/**
 * Verifies a JWT refresh token.
 * @param {String} token - JWT refresh token.
 * @returns {Object} - Decoded payload.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, jwtConfig.refreshSecret);
};

/**
 * Logs in a merchant with device tracking and optional remember-me functionality.
 * @param {String} email - Merchant's email.
 * @param {String} password - Merchant's password.
 * @param {Object} deviceInfo - Device details (deviceId, deviceType).
 * @param {Boolean} rememberMe - Whether to generate a remember token.
 * @returns {Object} - User, tokens, and optional remember token data.
 */
const loginMerchant = async (email, password, deviceInfo, rememberMe = false) => {
  try {
    logger.info('Attempting merchant login', { email, deviceInfo, rememberMe });
    const user = await User.scope(null).findOne({
      where: { email, role_id: 19 },
      include: [{
        model: Merchant,
        as: 'merchant',
        required: true
      }]
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
        last_active_at: new Date()
      }
    });

    let rememberTokenData = null;
    if (rememberMe) {
      rememberTokenData = await TokenService.generateRememberToken(user.id, deviceInfo.deviceId);
    } else {
      await device.update({ last_active_at: new Date() });
    }

    logger.info('Merchant login successful', { userId: user.id });
    return {
      user: {
        ...user.toJSON(),
        merchant: user.merchant
      },
      accessToken,
      refreshToken,
      rememberToken: rememberTokenData?.rememberToken,
      rememberTokenExpiry: rememberTokenData?.expiresAt
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
    if (clearAllDevices) {
      await TokenService.clearAllRememberTokens(userId);
    } else if (deviceId) {
      await TokenService.logoutUser(userId, deviceId);
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
  generateToken, 
  verifyToken, 
  generateRefreshToken, 
  verifyRefreshToken, 
  loginMerchant, 
  logoutMerchant 
};