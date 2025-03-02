// src/controllers/merchant/profile/profileController.js
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const merchantProfileService = require('@services/merchant/profile/profileService');
const { logger } = require('@utils/logger');

const profileController = {
  getProfile: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId || req.params.merchantId;
    const includeBranches = req.query.includeBranches === 'true';
    const profile = await merchantProfileService.getProfile(merchantId, { includeBranches });
    res.status(200).json({
      status: 'success',
      data: profile
    });
  }),

  updateProfile: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId;
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
    const merchantId = req.user.merchantId;
    const profile = await merchantProfileService.updateBusinessHours(merchantId, req.body.businessHours);
    res.status(200).json({
      status: 'success',
      message: 'Business hours updated successfully',
      data: profile
    });
  }),

  updateDeliverySettings: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId;
    const profile = await merchantProfileService.updateDeliverySettings(merchantId, req.body.deliverySettings);
    res.status(200).json({
      status: 'success',
      message: 'Delivery settings updated successfully',
      data: profile
    });
  }),

  createBranch: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId;
    const branch = await merchantProfileService.createBranch(merchantId, req.body);
    res.status(201).json({
      status: 'success',
      message: 'Branch created successfully',
      data: branch
    });
  }),

  updateBranch: catchAsync(async (req, res) => {
    const merchantId = req.user.merchantId;
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