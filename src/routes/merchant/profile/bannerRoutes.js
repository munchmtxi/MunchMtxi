'use strict';
const express = require('express');
const router = express.Router();
const bannerController = require('@controllers/merchant/profile/bannerController');
const merchantBannerMiddleware = require('@middleware/merchantBannerMiddleware');

// Base route: /merchant/profile/banners
router
  .route('/')
  .post(
    merchantBannerMiddleware.protectBanner,
    merchantBannerMiddleware.uploadBannerImage,
    bannerController.addBanner
  )
  .get(merchantBannerMiddleware.protectBanner, bannerController.getActiveBanners);

router
  .route('/:bannerId')
  .get(
    merchantBannerMiddleware.protectBanner,
    merchantBannerMiddleware.restrictToBannerOwner,
    bannerController.getBanner
  )
  .patch(
    merchantBannerMiddleware.protectBanner,
    merchantBannerMiddleware.restrictToBannerOwner,
    merchantBannerMiddleware.uploadBannerImage,
    bannerController.updateBanner
  )
  .delete(
    merchantBannerMiddleware.protectBanner,
    merchantBannerMiddleware.restrictToBannerOwner,
    bannerController.deleteBanner
  );

router
  .route('/order')
  .patch(merchantBannerMiddleware.protectBanner, bannerController.updateBannerOrder);

module.exports = router;