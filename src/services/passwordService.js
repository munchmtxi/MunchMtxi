const crypto = require('crypto');
const { User } = require('@models');
const emailService = require('@services/common/emailService');
const AppError = require('@utils/AppError');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');

const createPasswordResetToken = async (email) => {
  console.log('--- Starting createPasswordResetToken ---', { email });
  const user = await User.findOne({ where: { email } });
  if (!user) {
    console.log('No user found for email:', email);
    throw new AppError('No user found with that email', 404);
  }
  console.log('User found:', user.id, 'Current Password:', user.password);

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.passwordResetToken = hashedToken;
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  await user.save();
  console.log('Reset Token Generated:', hashedToken);

  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  const message = `You requested a password reset. POST to: \n\n ${resetURL}`;
  await emailService.sendEmail({ to: user.email, subject: 'Password Reset', text: message }); // Fixed typo
  console.log('Reset Email Sent to:', user.email);

  return resetToken;
};

const resetPassword = async (token, newPassword) => {
  console.log('--- Starting resetPassword ---', { token, newPassword });
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: { [Op.gt]: Date.now() },
    },
  });
  if (!user) {
    console.log('No user found for token:', hashedToken);
    throw new AppError('Token is invalid or has expired', 400);
  }
  console.log('User found:', user.id, 'Current Password:', user.password);

  const newHash = await bcrypt.hash(newPassword, 12);
  console.log('Generated New Hash:', newHash);
  user.password = newHash;
  user.passwordResetToken = null;
  user.passwordResetExpires = null;
  await user.save();
  console.log('Password Updated - New Hash:', user.password);

  return user;
};

const verifyResetToken = async (token) => {
  console.log('--- Starting verifyResetToken ---', { token });
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    where: {
      passwordResetToken: hashedToken,
      passwordResetExpires: { [Op.gt]: Date.now() },
    },
  });
  if (!user) {
    console.log('Token invalid or expired:', hashedToken);
    throw new AppError('Token is invalid or has expired', 400);
  }
  console.log('Token valid for user:', user.id);
  return true;
};

module.exports = { createPasswordResetToken, resetPassword, verifyResetToken };