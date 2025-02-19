// src/controllers/merchantControllers/profileControllers/profileController.js
const { catchAsync } = require('@utils/catchAsync');
const { validateProfileUpdate } = require('@validators/merchantValidators/profileValidators/profileValidator')
const merchantProfileService = require('@services/merchantServices/profileServices/profileService')
const AppError = require('@utils/AppError');

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