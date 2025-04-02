const { 
  registerUser, 
  loginUser, 
  verifyRefreshToken, 
  generateToken, 
  generateRefreshToken,
  loginMerchant,
  logoutMerchant,
  loginDriver, // Added
  logoutDriver // Added
} = require('@services/common/authService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

// If needed, import getModels from your models module, e.g.:
// const { getModels } = require('@models');

/**
 * Registers a new user (Customer).
 */
const register = catchAsync(async (req, res) => {
  logger.info('START: Registering new customer', { requestBody: req.body });
  const user = await registerUser(req.body);
  logger.info('SUCCESS: Customer registered', { userId: user.id, details: user });
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
  logger.info('END: Registering new customer');
});

/**
 * Logs in a user and provides JWT tokens.
 */
const login = catchAsync(async (req, res) => {
  const { email, password, deviceInfo } = req.body; // Add deviceInfo
  logger.info('START: User login attempt initiated', { email });
  
  logger.debug('Input received for login', { email, passwordLength: password?.length, deviceInfo });
  
  const loginResult = await loginUser(email, password, deviceInfo); // Pass deviceInfo
  const { user, accessToken, refreshToken } = loginResult;
  logger.info('Login service response received', {
    userId: user?.id,
    tokenStatus: accessToken ? 'present' : 'missing',
    refreshTokenStatus: refreshToken ? 'present' : 'missing'
  });
  
  if (accessToken) {
    logger.debug('Access token details', { accessTokenLength: accessToken.length });
  }
  if (refreshToken) {
    logger.debug('Refresh token details', { refreshTokenLength: refreshToken.length });
  }
  
  if (!accessToken) {
    logger.warn('Access token is missing in login result', { email });
  }
  
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
      token: accessToken,
      refreshToken,
    },
  });
  
  logger.info('END: User login process completed', { email, tokenStatus: accessToken ? 'issued' : 'not issued' });
});

/**
 * Refreshes the JWT access token using a refresh token.
 */
const refreshTokenController = catchAsync(async (req, res) => {
  logger.info('START: Refreshing JWT token', { requestBody: req.body });
  const { refreshToken } = req.body;
  if (!refreshToken) {
    logger.warn('FAILED: Refresh token missing');
    throw new AppError('Refresh token is required', 400);
  }

  logger.info('Validating refresh token', { refreshToken: refreshToken.slice(0, 10) + '...' });
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
    logger.info('SUCCESS: Refresh token verified', { userId: decoded.id });
  } catch (error) {
    logger.warn('FAILED: Invalid refresh token', { error: error.message });
    throw new AppError('Invalid refresh token', 401);
  }

  const newToken = generateToken({ id: decoded.id, role: decoded.role });
  const newRefreshToken = generateRefreshToken({ id: decoded.id, role: decoded.role });
  logger.info('SUCCESS: New tokens generated', { userId: decoded.id });

  res.status(200).json({
    status: 'success',
    data: {
      token: newToken,
      refreshToken: newRefreshToken,
    },
  });
  logger.info('END: Token refresh process completed', { userId: decoded.id });
});

/**
 * Registers a new user with non-customer roles (Merchant, Staff, Driver) - Admin Only.
 */
const registerNonCustomer = catchAsync(async (req, res) => {
  logger.info('START: Registering non-customer', { requestUser: req.user, requestBody: req.body });
  // Assuming req.user.role_id is set by authenticate middleware
  if (req.user.role_id !== 1) { // Assume 1 is Admin role_id, adjust as needed
    logger.warn('FAILED: Non-admin attempted to register non-customer', { userId: req.user.id });
    throw new AppError('Only Admins can register non-customer roles', 403);
  }

  const { role, ...userData } = req.body;
  logger.info('Mapping role for registration', { providedRole: role });
  
  // Map role string to role_id (adjust based on your roles table)
  const roleMap = { 'Merchant': 19, 'Staff': 20, 'Driver': 21 }; // Example mapping
  if (!roleMap[role]) {
    logger.error('FAILED: Invalid role provided for non-customer registration', { providedRole: role });
    throw new AppError('Invalid role for registration', 400);
  }

  const user = await registerUser({ ...userData, role: roleMap[role] });
  logger.info('SUCCESS: Non-customer registered', { userId: user.id, role: role });

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
  logger.info('END: Non-customer registration process completed', { userId: user.id });
});

/**
 * Logs in a merchant with device tracking and optional remember-me functionality.
 */
const merchantLogin = catchAsync(async (req, res) => {
  const { email, password, deviceId, deviceType, rememberMe } = req.body;
  logger.info('START: Merchant login attempt', { email, deviceId, deviceType, rememberMe });
  
  // Use dynamic model access
  const { User } = req.app.locals.models || getModels();
  logger.info('User model fetched in controller', { modelAvailable: !!User });

  // DB test to ensure connection is active
  logger.info('Performing database connection test', { email });
  try {
    await User.findOne({ where: { id: 1 } });
    logger.info('SUCCESS: Database connection test passed');
  } catch (dbError) {
    logger.error('FAILED: Database connection test failed', { error: dbError.message });
    throw new AppError('Database unavailable', 500);
  }

  logger.info('Proceeding with merchant login', { email });
  const result = await loginMerchant(email, password, { deviceId, deviceType }, rememberMe);
  logger.info('SUCCESS: Merchant logged in', { userId: result.user.id });

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
  logger.info('END: Merchant login process completed', { userId: result.user.id });
});

/**
 * Logs out a merchant, optionally clearing specific or all device sessions.
 */
const logout = catchAsync(async (req, res) => {
  const { deviceId, clearAllDevices } = req.body;
  logger.info('START: Merchant logout attempt', { userId: req.user.id, deviceId, clearAllDevices });

  await logoutMerchant(req.user.id, deviceId, clearAllDevices);
  logger.info('SUCCESS: Merchant logged out', { userId: req.user.id });

  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out'
  });
  logger.info('END: Merchant logout process completed', { userId: req.user.id });
});

/**
 * Logs in a driver
 */
const driverLogin = catchAsync(async (req, res) => {
  const { email, password, deviceId, deviceType } = req.body;
  logger.info('START: Driver login attempt', { email, deviceId, deviceType });

  const result = await loginDriver(email, password, { deviceId, deviceType });
  logger.info('SUCCESS: Driver logged in', { userId: result.user.id });

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
        roleId: result.user.role_id, // Now receives 3 from loginDriver
        isVerified: result.user.is_verified,
        driver: result.user.driver_profile, // Updated to match service naming
        createdAt: result.user.created_at,
        updatedAt: result.user.updated_at,
      },
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
  logger.info('END: Driver login process completed', { userId: result.user.id });
});

/**
 * Logs out a driver
 */
const driverLogout = catchAsync(async (req, res) => {
  const { deviceId } = req.body;
  logger.info('START: Driver logout attempt', { userId: req.user.id, deviceId });

  await logoutDriver(req.user.id, deviceId);
  logger.info('SUCCESS: Driver logged out', { userId: req.user.id });

  res.status(200).json({
    status: 'success',
    message: 'Successfully logged out',
  });
  logger.info('END: Driver logout process completed', { userId: req.user.id });
});

module.exports = { 
  register, 
  login, 
  refreshToken: refreshTokenController, 
  registerNonCustomer, 
  merchantLogin, 
  logout,
  driverLogin,
  driverLogout,
};