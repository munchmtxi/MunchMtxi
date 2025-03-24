'use strict';
const { getProfile, updateProfile, changePassword, managePaymentMethods } = require('@services/customer/profile/profileService');
const catchAsync = require('@utils/catchAsync');
const { logger } = require('@utils/logger');

const getProfileController = catchAsync(async (req, res) => {
  logger.info('Fetching customer profile', { userId: req.user.id });
  const profile = await getProfile(req.user.id);
  res.status(200).json({
    status: 'success',
    data: {
      id: profile.id,
      firstName: profile.first_name,
      lastName: profile.last_name,
      email: profile.email,
      phone: profile.phone,
      address: profile.customer_profile.address,
      paymentMethods: profile.customer_profile.payment_methods,
    },
  });
});

const updateProfileController = catchAsync(async (req, res) => {
  logger.info('Updating customer profile', { userId: req.user.id, updates: req.body });
  const { user, customer } = await updateProfile(req.user.id, req.body);
  res.status(200).json({
    status: 'success',
    data: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      address: customer.address,
    },
  });
});

const changePasswordController = catchAsync(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  logger.info('Changing password', { userId: req.user.id });
  await changePassword(req.user.id, currentPassword, newPassword);
  res.status(200).json({ status: 'success', message: 'Password updated successfully' });
});

const managePaymentMethodsController = catchAsync(async (req, res) => {
  const { action, paymentMethod } = req.body;
  logger.info('Managing payment methods', { userId: req.user.id, action });
  const updatedMethods = await managePaymentMethods(req.user.id, action, paymentMethod);
  res.status(200).json({ status: 'success', data: updatedMethods });
});

module.exports = {
  getProfileController,
  updateProfileController,
  changePasswordController,
  managePaymentMethodsController,
};