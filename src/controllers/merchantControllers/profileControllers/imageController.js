// src/controllers/merchantControllers/profileControllers/imageController.js
const catchAsync = require('@utils/catchAsync');
const merchantImageService = require('@services/merchantServices/profileServices/imageService');
const { validateImageType, validateImageFile } = require('@validators/merchantValidators/profileValidators/imageValidator');
const AppError = require('@utils/AppError');

exports.uploadMerchantImage = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { type } = req.query;

  // Validate image type
  const typeValidation = validateImageType.validate({ type });
  if (typeValidation.error) {
    throw new AppError(typeValidation.error.details[0].message, 400);
  }

  // Validate file
  const fileValidation = validateImageFile(req.file);
  if (fileValidation.error) {
    throw new AppError(fileValidation.error.message, 400);
  }

  const result = await merchantImageService.uploadImage(
    merchantId,
    req.file,
    type
  );

  res.status(200).json(result);
});

exports.getMerchantImages = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  
  const images = await merchantImageService.getMerchantImages(merchantId);
  
  res.status(200).json({
    status: 'success',
    data: { images }
  });
});

exports.deleteMerchantImage = catchAsync(async (req, res) => {
  const { merchantId, imageId } = req.params;
  const { type } = req.query;

  const typeValidation = validateImageType.validate({ type });
  if (typeValidation.error) {
    throw new AppError(typeValidation.error.details[0].message, 400);
  }

  const result = await merchantImageService.deleteImage(merchantId, imageId, type);
  res.status(200).json(result);
});