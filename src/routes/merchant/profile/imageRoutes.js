const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('@middleware/authMiddleware');
const { uploadImage, deleteImage } = require('@controllers/merchant/profile/imageController');

// Routes for merchant image management
router
  .route('/images')
  .post(protect, restrictTo('merchant'), uploadImage); // Upload image

router
  .route('/images/:imageType')
  .delete(protect, restrictTo('merchant'), deleteImage); // Delete image

module.exports = router;