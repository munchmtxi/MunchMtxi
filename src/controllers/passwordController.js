// src/controllers/passwordController.js
const passwordService = require('@services/passwordService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');

const forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;
  const resetToken = await createPasswordResetToken(email);

  res.status(200).json({
    status: 'success',
    message: 'Token sent to email!',
    data: { resetToken }, // For development purposes; remove in production
  });
});

const resetPasswordController = catchAsync(async (req, res, next) => {
  const { token, newPassword } = req.body;
  await resetPassword(token, newPassword);

  res.status(200).json({
    status: 'success',
    message: 'Password reset successful!',
  });
});

module.exports = { forgotPassword, resetPassword: resetPasswordController };
