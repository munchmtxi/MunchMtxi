// src/controllers/merchant/profile/imageController.js
const catchAsync = require('@utils/catchAsync');
const ImageService = require('@services/merchant/imageService');
const AppError = require('@utils/AppError');
const multer = require('multer');
const { logger } = require('@utils/logger');

const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const supportedFormats = ['image/jpeg', 'image/png', 'image/webp'];
    if (!supportedFormats.includes(file.mimetype)) {
      return cb(new AppError('Unsupported file format', 400));
    }
    cb(null, true);
  },
});

const uploadImage = catchAsync(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No image file provided', 400));
  }

  const { imageType } = req.body;
  if (!imageType || !['logo', 'banner', 'storefront'].includes(imageType)) {
    return next(new AppError('Invalid or missing image type. Must be logo, banner, or storefront', 400));
  }

  const merchantId = req.user.merchantId; // Set by restrictToMerchantProfile
  const result = await ImageService.uploadImage(merchantId, req.file, imageType);

  logger.info(`Image uploaded successfully for merchant ${merchantId}`, { imageType });
  res.status(200).json(result);
});

const deleteImage = catchAsync(async (req, res, next) => {
  const { imageType } = req.params;
  if (!imageType || !['logo', 'banner', 'storefront'].includes(imageType)) {
    return next(new AppError('Invalid or missing image type. Must be logo, banner, or storefront', 400));
  }

  const merchantId = req.user.merchantId; // Set by restrictToMerchantProfile
  const result = await ImageService.deleteImage(merchantId, imageType);

  logger.info(`Image deleted successfully for merchant ${merchantId}`, { imageType });
  res.status(200).json(result);
});

module.exports = {
  uploadImage: [upload.single('image'), uploadImage],
  deleteImage,
};