// src/controllers/merchant/profile/getProfile.js
'use strict';

const GetProfileService = require('@services/merchant/profile/getProfileService');
const catchAsync = require('@utils/catchAsync');

const getProfile = catchAsync(async (req, res) => {
  const merchantId = req.params.merchantId; // Extract from route params
  const profile = await GetProfileService.execute(merchantId);

  res.status(200).json({
    status: 'success',
    data: profile,
  });
});

module.exports = {
  getProfile,
};