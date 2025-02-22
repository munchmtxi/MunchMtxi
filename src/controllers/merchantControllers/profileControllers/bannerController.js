// src/controllers/merchantControllers/profileControllers/bannerController.js
const catchAsync = require('@utils/catchAsync');
const { validateBanner, validateBannerOrder } = require('@validators/merchantValidators/profileValidators/bannerValidator');
const bannerService = require('@services/merchantServices/profileServices/bannerService');
const AppError = require('@utils/AppError');

exports.addBanner = catchAsync(async (req, res) => {
  const { error, value } = validateBanner(req.body);
  
  if (error) {
    throw new AppError(
      error.details[0].message,
      400,
      'VALIDATION_ERROR',
      error.details
    );
  }

  if (!req.file) {
    throw new AppError(
      'Banner image is required',
      400,
      'VALIDATION_ERROR'
    );
  }

  const banner = await bannerService.addBanner(
    req.params.merchantId,
    req.user.id,
    value,
    req.file
  );

  res.status(201).json({
    status: 'success',
    data: { banner }
  });
});

exports.updateBanner = catchAsync(async (req, res) => {
  const { error, value } = validateBanner(req.body);
  
  if (error) {
    throw new AppError(
      error.details[0].message,
      400,
      'VALIDATION_ERROR',
      error.details
    );
  }

  const banner = await bannerService.updateBanner(
    req.params.merchantId,
    req.params.bannerId,
    req.user.id,
    value,
    req.file
  );

  res.status(200).json({
    status: 'success',
    data: { banner }
  });
});

exports.deleteBanner = catchAsync(async (req, res) => {
  await bannerService.deleteBanner(
    req.params.merchantId,
    req.params.bannerId,
    req.user.id
  );

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getActiveBanners = catchAsync(async (req, res) => {
  const banners = await bannerService.getActiveBanners(req.params.merchantId);

  res.status(200).json({
    status: 'success',
    data: { banners }
  });
});

exports.updateBannerOrder = catchAsync(async (req, res) => {
  const { error, value } = validateBannerOrder(req.body);
  
  if (error) {
    throw new AppError(
      error.details[0].message,
      400,
      'VALIDATION_ERROR',
      error.details
    );
  }

  await bannerService.updateBannerOrder(req.params.merchantId, value);

  res.status(200).json({
    status: 'success',
    message: 'Banner order updated successfully'
  });
});
