// src/routes/merchantRoutes/profileRoutes/imageRoutes.js
const router = require('express').Router();
const { hasMerchantPermission } = require('@middleware/authMiddleware');
const { uploadImage, handleUploadError } = require('@middleware/uploadMiddleware');
const {
  uploadMerchantImage,
  deleteMerchantImage,
  getMerchantImages
} = require('@controllers/merchantControllers/profileControllers/imageController');

// Create middleware for image type validation
const validateImageTypeMiddleware = (req, res, next) => {
  const { validateImageType } = require('@validators/merchantValidators/profileValidators/imageValidator');
  const { type } = req.query;
  
  const { error } = validateImageType.validate({ type });
  if (error) {
    return res.status(400).json({
      status: 'error',
      message: error.details[0].message
    });
  }
  next();
};

router.get(
  '/',
  hasMerchantPermission('view_profile'),
  getMerchantImages
);

router.post(
  '/',
  hasMerchantPermission('update_profile'),
  uploadImage,
  handleUploadError,
  validateImageTypeMiddleware,
  uploadMerchantImage
);

router.delete(
  '/:imageId',
  hasMerchantPermission('update_profile'),
  validateImageTypeMiddleware,
  deleteMerchantImage
);

module.exports = router;