// src/controllers/authController.js
const { 
  registerUser, 
  loginUser, 
  verifyRefreshToken, 
  generateToken, 
  generateRefreshToken,
  loginMerchant,
  logoutMerchant 
} = require('@services/common/authService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

/**
 * Registers a new user (Customer).
 */
const register = catchAsync(async (req, res) => {
  logger.info('Registering new customer', { body: req.body });
  const user = await registerUser(req.body);
  logger.info('Customer registered successfully', { userId: user.id });
  res.status(201).json({
    status: 'success',
    data: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      country: user.country,
      merchantType: user.merchant_type,
      roleId: user.role_id,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  });
});

/**
 * Logs in a user and provides JWT tokens.
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  logger.info('User login attempt', { email });
  const { user, token, refreshToken } = await loginUser(email, password);
  logger.info('User login successful', { userId: user.id });
  res.status(200).json({
    status: 'success',
    data: { 
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        country: user.country,
        merchantType: user.merchant_type,
        roleId: user.role_id,
        isVerified: user.is_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      token,
      refreshToken,
    },
  });
});

/**
 * Refreshes the JWT access token using a refresh token.
 */
const refreshTokenController = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    logger.warn('Refresh token missing');
    throw new AppError('Refresh token is required', 400);
  }

  logger.info('Refreshing token', { refreshToken: refreshToken.slice(0, 10) + '...' });
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    logger.warn('Invalid refresh token', { error: error.message });
    throw new AppError('Invalid refresh token', 401);
  }

  const newToken = generateToken({ id: decoded.id, role: decoded.role });
  const newRefreshToken = generateRefreshToken({ id: decoded.id, role: decoded.role });
  logger.info('Token refreshed successfully', { userId: decoded.id });

  res.status(200).json({
    status: 'success',
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
    },
  });
});

/**
 * Registers a new user with non-customer roles (Merchant, Staff, Driver) - Admin Only.
 */
const registerNonCustomer = catchAsync(async (req, res) => {
  // Assuming req.user.role_id is set by authenticate middleware
  if (req.user.role_id !== 1) { // Assume 1 is Admin role_id, adjust as needed
    logger.warn('Non-admin attempted to register non-customer', { userId: req.user.id });
    throw new AppError('Only Admins can register non-customer roles', 403);
  }

  const { role, ...userData } = req.body;
  logger.info('Registering non-customer', { role, email: userData.email });
  
  // Map role string to role_id (adjust based on your roles table)
  const roleMap = { 'Merchant': 19, 'Staff': 20, 'Driver': 21 }; // Example mapping
  if (!roleMap[role]) {
    throw new AppError('Invalid role for registration', 400);
  }

  const user = await registerUser({ ...userData, role: roleMap[role] });
  logger.info('Non-customer registered successfully', { userId: user.id });

  res.status(201).json({
    status: 'success',
    data: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      country: user.country,
      merchantType: user.merchant_type,
      roleId: user.role_id,
      isVerified: user.is_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  });
});

/**
 * Logs in a merchant with device tracking and optional remember-me functionality.
 */
const merchantLogin = catchAsync(async (req, res) => {
  const { email, password, deviceId, deviceType, rememberMe } = req.body;
  logger.info('Merchant login attempt', { email, deviceId, deviceType, rememberMe });

  const result = await loginMerchant(email, password, { deviceId, deviceType }, rememberMe);
  logger.info('Merchant login successful', { userId: result.user.id });

  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: result.user.id,
        firstName: result.user.first_name,
        lastName: result.user.last_name,
        email: result.user.email,
        phone: result.user.phone,
        country: result.user.country,
        merchantType: result.user.merchant_type,
        roleId: result.user.role_id,
        isVerified: result.user.is_verified,
        merchant: result.user.merchant,
        createdAt: result.user.created_at,
        updatedAt: result.user.updated_at,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      rememberToken: result.rememberToken,
      rememberTokenExpiry: result.rememberTokenExpiry
    }
  });
});

/**
 * Logs out a merchant, optionally clearing specific or all device sessions.
 */
const logout = catchAsync(async (req, res) => {
  const { deviceId, clearAllDevices } = req.body;
  logger.info('Merchant logout attempt', { userId: req.user.id, deviceId, clearAllDevices });

  await logoutMerchant(req.user.id, deviceId, clearAllDevices);
  logger.info('Merchant logout successful', { userId: req.user.id });

  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out'
  });
});

module.exports = { 
  register, 
  login, 
  refreshToken: refreshTokenController, 
  registerNonCustomer, 
  merchantLogin, 
  logout 
};