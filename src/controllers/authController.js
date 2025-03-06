// src/controllers/authController.js
const authService = require('@services/common/authService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

/**
 * Registers a new user (Customer).
 */
const register = catchAsync(async (req, res) => {
  const user = await registerUser(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      country: user.country,
      merchantType: user.merchantType,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

/**
 * Logs in a user and provides JWT tokens.
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const { user, token, refreshToken } = await loginUser(email, password);
  res.status(200).json({
    status: 'success',
    data: { 
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        country: user.country,
        merchantType: user.merchantType,
        role: user.role,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      token,
      refreshToken,
    },
  });
});

/**
 * Refreshes the JWT access token using a refresh token.
 */
const refreshTokenController = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 400);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AppError('Invalid refresh token', 401);
  }

  const newToken = generateToken({ id: decoded.id, role: decoded.role });
  const newRefreshToken = generateRefreshToken({ id: decoded.id, role: decoded.role });

  // Optionally, invalidate the old refresh token and store the new one

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
const registerNonCustomer = catchAsync(async (req, res, next) => {
  // Ensure the requester is an Admin
  if (req.user.role !== 'Admin') {
    throw new AppError('Only Admins can register non-customer roles', 403);
  }

  const { role, ...userData } = req.body;
  if (!['Merchant', 'Staff', 'Driver'].includes(role)) {
    throw new AppError('Invalid role for registration', 400);
  }

  const user = await registerUser({ ...userData, role });
  res.status(201).json({
    status: 'success',
    data: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      country: user.country,
      merchantType: user.merchantType,
      role: user.role,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
});

// Add this new controller
const merchantLogin = catchAsync(async (req, res) => {
  const { email, password, deviceId, deviceType, rememberMe } = req.body;
  
  const result = await authService.loginMerchant(
    email,
    password,
    { deviceId, deviceType },
    rememberMe
  );

  res.status(200).json({
    status: 'success',
    data: result
  });
});

const logout = catchAsync(async (req, res) => {
  const { deviceId, clearAllDevices } = req.body;
  
  await authService.logoutMerchant(req.user.id, deviceId, clearAllDevices);
  
  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out'
  });
});

module.exports = { register, login, refreshToken: refreshTokenController, registerNonCustomer, merchantLogin, logout };
