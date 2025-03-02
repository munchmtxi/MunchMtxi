// src/services/2faService.js
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { User } = require('@models');
const AppError = require('@utils/AppError');

const generate2FASecret = async (userId) => {
  const secret = speakeasy.generateSecret({ length: 20 });
  await User.update({ twoFactorSecret: secret.base32 }, { where: { id: userId } });
  return secret;
};

const verify2FACode = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
  });
};

const getQRCode = async (userId, email) => {
  const user = await User.findByPk(userId);
  if (!user) throw new AppError('User not found', 404);
  const secret = user.twoFactorSecret;
  const otpauthUrl = speakeasy.otpauthURL({ secret, label: email, issuer: 'YourAppName' });
  const qrCodeDataURL = await QRCode.toDataURL(otpauthUrl);
  return qrCodeDataURL;
};

module.exports = { generate2FASecret, verify2FACode, getQRCode };
