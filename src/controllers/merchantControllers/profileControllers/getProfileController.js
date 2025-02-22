// src/controllers/merchantControllers/profileControllers/getProfileController.js
const catchAsync = require('@utils/catchAsync');
const getProfileService = require('@services/merchantServices/profileServices/getProfileService');

// Export the handler function directly
exports.getProfile = catchAsync(async (req, res) => {
  const profile = await getProfileService.execute(req.user.merchantId);
  
  res.status(200).json({
    status: 'success',
    data: { profile }
  });
});