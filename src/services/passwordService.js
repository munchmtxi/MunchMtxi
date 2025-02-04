// src/services/passwordService.js
const crypto = require('crypto');
const { User } = require('@models');
const emailService = require('@services/emailService');
const AppError = require('@utils/AppError');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const createPasswordResetToken = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) throw new AppError('No user found with that email', 404);

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes
  await user.save();

  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const message = `You requested a password reset. Please make a POST request to: \n\n ${resetURL}`;

  await sendEmail({
    to: user.email,
    subject: 'Password Reset',
    text: message,
  });

  return resetToken;
};

const resetPassword = async (token, newPassword) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: { [Op.gt]: Date.now() },
    },
  });

  if (!user) throw new AppError('Token is invalid or has expired', 400);

  user.password = await bcrypt.hash(newPassword, 12);
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();

  // Optionally, log the user in by sending a new JWT

  return user;
};

module.exports = { createPasswordResetToken, resetPassword };
