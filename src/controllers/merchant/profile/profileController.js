// src/controllers/merchant/profile/profileController.js
'use strict';
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const merchantProfileService = require('@services/merchant/profile/profileService');
const { Merchant } = require('@models');
const { logger } = require('@utils/logger');

const profileController = {
  getProfile: catchAsync(async (req, res) => {
    logger.info('Entering getProfile', { user: req.user });
    const userId = req.user.id;
    logger.info('Fetching merchant for user', { userId });
    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) {
      logger.error('No merchant found for user', { userId });
      throw new AppError('Merchant not found for this user', 404);
    }
    const merchantId = merchant.id;
    logger.info('Calling getProfile with merchantId', { merchantId });
    const includeBranches = req.query.includeBranches === 'true';
    const profile = await merchantProfileService.getProfile(merchantId, { includeBranches });
    logger.info('Profile retrieved', { merchantId });
    res.status(200).json({
      status: 'success',
      data: profile
    });
  }),

  // Other methods unchanged—they rely on req.user.merchantId, which might need similar fixes if called
  updateProfile: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) throw new AppError('Merchant not found', 404);
    const merchantId = merchant.id;
    const authToken = req.headers.authorization?.split(' ')[1];
    if (!authToken) throw new AppError('Authentication token required', 401);
    const profile = await merchantProfileService.updateProfile(merchantId, req.body, authToken);
    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: profile
    });
  }),

  updateBusinessHours: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) throw new AppError('Merchant not found', 404);
    const merchantId = merchant.id;
    const profile = await merchantProfileService.updateBusinessHours(merchantId, req.body.businessHours);
    res.status(200).json({
      status: 'success',
      message: 'Business hours updated successfully',
      data: profile
    });
  }),

  updateDeliverySettings: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) throw new AppError('Merchant not found', 404);
    const merchantId = merchant.id;
    const profile = await merchantProfileService.updateDeliverySettings(merchantId, req.body.deliverySettings);
    res.status(200).json({
      status: 'success',
      message: 'Delivery settings updated successfully',
      data: profile
    });
  }),

  createBranch: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) throw new AppError('Merchant not found', 404);
    const merchantId = merchant.id;
    const branch = await merchantProfileService.createBranch(merchantId, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Branch created successfully',
      data: branch
    });
  }),

  updateBranch: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) throw new AppError('Merchant not found', 404);
    const merchantId = merchant.id;
    const branchId = req.params.branchId;
    const branch = await merchantProfileService.updateBranch(merchantId, branchId, req.body);
    res.status(200).json({
      status: 'success',
      message: 'Branch updated successfully',
      data: branch
    });
  })
};

module.exports = profileController;