// src/controllers/passwordController.js

const passwordService = require('@services/common/passwordService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { PasswordResetLog } = require('@models');

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const ip = req.ip || req.connection.remoteAddress;
  
  try {
    // Service should return user info for logging
    const { user, token } = await passwordService.createPasswordResetToken(email);
    
    // Log the attempt with user id if found
    await PasswordResetLog.create({
      user_id: user ? user.id : null,
      status: 'success',
      ip_address: ip,
      action: 'forgot_password_request'
    });

    // Don't reveal if user exists
    res.status(200).json({
      status: 'success',
      message: 'If a user with that email exists, a reset link has been sent.'
    });
  } catch (error) {
    await PasswordResetLog.create({
      user_id: null,
      status: 'failed',
      ip_address: ip,
      action: 'forgot_password_request',
      error: error.message
    });
    next(error);
  }
});

const verifyResetToken = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  
  try {
    const { user } = await passwordService.verifyResetToken(token);
    
    await PasswordResetLog.create({
      user_id: user.id,
      status: 'success',
      ip_address: req.ip || req.connection.remoteAddress,
      action: 'verify_token'
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Token is valid'
    });
  } catch (error) {
    await PasswordResetLog.create({
      user_id: null,
      status: 'failed',
      ip_address: req.ip || req.connection.remoteAddress,
      action: 'verify_token',
      error: error.message
    });
    next(error);
  }
});

const resetPassword = catchAsync(async (req, res, next) => {
  const { token } = req.params;
  const { newPassword } = req.body;
  const ip = req.ip || req.connection.remoteAddress;

  try {
    const { user } = await passwordService.resetPassword(token, newPassword);
    
    await PasswordResetLog.create({
      user_id: user.id,
      status: 'success',
      ip_address: ip,
      action: 'reset_password'
    });

    res.status(200).json({
      status: 'success',
      message: 'Password reset successful!'
    });
  } catch (error) {
    await PasswordResetLog.create({
      user_id: null,
      status: 'failed',
      ip_address: ip,
      action: 'reset_password',
      error: error.message
    });
    next(error);
  }
});

module.exports = { 
  forgotPassword, 
  resetPassword,
  verifyResetToken 
};