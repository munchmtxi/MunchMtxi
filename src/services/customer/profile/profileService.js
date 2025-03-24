// src/services/customer/profile/profileService.js
'use strict';
const { User, Customer } = require('@models');
const AppError = require('@utils/AppError');
const bcrypt = require('bcryptjs');
const { logger } = require('@utils/logger');

const getProfile = async (userId) => {
  const user = await User.findByPk(userId, {
    include: [{ model: Customer, as: 'customer_profile' }],
  });
  if (!user) throw new AppError('User not found', 404);
  return user;
};

const updateProfile = async (userId, updates) => {
  const { firstName, lastName, phone, address } = updates;
  const user = await User.findByPk(userId);
  const customer = await Customer.findOne({ where: { user_id: userId } });

  if (!user || !customer) throw new AppError('User or customer profile not found', 404);

  if (firstName) user.first_name = firstName;
  if (lastName) user.last_name = lastName;
  if (phone) user.phone = phone;
  if (address) customer.address = address;

  await user.save();
  await customer.save();

  logger.info('Profile updated', { userId });
  return { user, customer };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  logger.info('START: Changing customer password', { userId });

  // Fetch user with password explicitly
  const user = await User.scope(null).findOne({
    where: { id: userId },
    attributes: ['id', 'password'], // Include password explicitly
  });
  if (!user) {
    logger.warn('User not found', { userId });
    throw new AppError('User not found', 404);
  }

  if (!user.password) {
    logger.error('Password field missing', { userId });
    throw new AppError('Password data unavailable', 500);
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) {
    logger.warn('Current password incorrect', { userId });
    throw new AppError('Current password is incorrect', 401);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await user.update({ password: hashedPassword });

  logger.info('SUCCESS: Password changed', { userId });
  return true;
};

const managePaymentMethods = async (userId, action, paymentMethod) => {
  const customer = await Customer.findOne({ where: { user_id: userId } });
  if (!customer) throw new AppError('Customer profile not found', 404);

  let paymentMethods = customer.payment_methods || [];
  if (action === 'add') {
    paymentMethods.push({ ...paymentMethod, id: Date.now().toString() });
  } else if (action === 'remove') {
    paymentMethods = paymentMethods.filter(pm => pm.id !== paymentMethod.id);
  } else if (action === 'setDefault') {
    paymentMethods = paymentMethods.map(pm => ({
      ...pm,
      isDefault: pm.id === paymentMethod.id,
    }));
  } else {
    throw new AppError('Invalid action', 400);
  }

  customer.payment_methods = paymentMethods;
  await customer.save();

  logger.info('Payment methods updated', { userId, action });
  return paymentMethods;
};

module.exports = { getProfile, updateProfile, changePassword, managePaymentMethods };