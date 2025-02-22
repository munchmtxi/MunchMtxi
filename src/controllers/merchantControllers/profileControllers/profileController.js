// src/controllers/merchantControllers/profileControllers/profileController.js
const catchAsync = require('@utils/catchAsync');
const { validateProfileUpdate } = require('@validators/merchantValidators/profileValidators/profileValidator');
const merchantProfileService = require('@services/merchantServices/profileServices/profileService');
const AppError = require('@utils/AppError');

// Get Profile
exports.getProfile = catchAsync(async (req, res) => {
  const merchant = await merchantProfileService.getProfile(
    req.user.merchantId
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      merchant
    }
  });
});

// Update Profile (your existing function)
exports.updateProfile = catchAsync(async (req, res) => {
  const { error, value } = validateProfileUpdate(req.body);
  
  if (error) {
    throw new AppError(
      error.details[0].message,
      400,
      'VALIDATION_ERROR',
      error.details
    );
  }

  const updatedMerchant = await merchantProfileService.updateProfile(
    req.user.merchantId,
    value,
    req.headers.authorization
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      merchant: updatedMerchant
    }
  });
});

// Update Business Hours
exports.updateBusinessHours = catchAsync(async (req, res) => {
  // Add validation if needed
  const updatedMerchant = await merchantProfileService.updateBusinessHours(
    req.user.merchantId,
    req.body
  );

  res.status(200).json({
    status: 'success',
    data: {
      merchant: updatedMerchant
    }
  });
});

// Update Delivery Settings
exports.updateDeliverySettings = catchAsync(async (req, res) => {
  // Add validation if needed
  const updatedMerchant = await merchantProfileService.updateDeliverySettings(
    req.user.merchantId,
    req.body
  );

  res.status(200).json({
    status: 'success',
    data: {
      merchant: updatedMerchant
    }
  });
});