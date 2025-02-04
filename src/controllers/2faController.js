// src/controllers/2faController.js
const twoFaService = require('@services/2faService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');

const setup2FA = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const secret = await generate2FASecret(userId);
  const qrCode = await getQRCode(userId, req.user.email);
  res.status(200).json({
    status: 'success',
    data: {
      qrCode,
      secret: secret.base32, // Optionally send the secret for manual entry
    },
  });
});

const verify2FA = catchAsync(async (req, res, next) => {
  const userId = req.user.id;
  const { token } = req.body;
  const user = await User.findByPk(userId);
  if (!user || !user.twoFactorSecret) {
    throw new AppError('2FA not setup for this user', 400);
  }

  const isValid = verify2FACode(user.twoFactorSecret, token);
  if (!isValid) {
    throw new AppError('Invalid 2FA token', 400);
  }

  // Optionally, mark user as 2FA verified in the session or token
  // Implementation depends on your session handling

  res.status(200).json({
    status: 'success',
    message: '2FA verification successful',
  });
});

module.exports = { setup2FA, verify2FA };
