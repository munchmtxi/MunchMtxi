// src/routes/merchantRoutes/profileRoutes/bannerRoutes.js
const express = require('express');
const {
  authenticate,
  hasMerchantPermission,
  isResourceOwner,
  checkRoleBasedRateLimit
} = require('@middleware/authMiddleware');

console.log('Middleware loaded:', {
  authenticate: !!authenticate,
  hasMerchantPermission: !!hasMerchantPermission,
  isResourceOwner: !!isResourceOwner,
  checkRoleBasedRateLimit: !!checkRoleBasedRateLimit
});

const { uploadBanner } = require('@middleware/uploadMiddleware');
const {
  addBanner,
  updateBanner,
  deleteBanner,
  getActiveBanners,
  updateBannerOrder
} = require('@controllers/merchantControllers/profileControllers/bannerController');

const router = express.Router({ mergeParams: true });

// Apply common middleware
router.use(authenticate);
router.use(checkRoleBasedRateLimit('merchant'));

router
  .route('/')
  .get(
    hasMerchantPermission('profile.view'),
    isResourceOwner,
    getActiveBanners
  )
  .post(
    hasMerchantPermission('profile.edit'),
    isResourceOwner,
    uploadBanner,
    addBanner
  );

router
  .route('/:bannerId')
  .put(
    hasMerchantPermission('profile.edit'),
    isResourceOwner,
    uploadBanner,
    updateBanner
  )
  .delete(
    hasMerchantPermission('profile.edit'),
    isResourceOwner,
    deleteBanner
  );

router
  .route('/order')
  .put(
    hasMerchantPermission('profile.edit'),
    isResourceOwner,
    updateBannerOrder
  );

module.exports = router;
