const express = require('express');
const router = express.Router({ mergeParams: true }); // Add mergeParams: true
const PreviewController = require('@controllers/merchant/profile/previewController');
const {
  requireMerchantRole,
  restrictToPreviewOwner,
  validatePreviewSession,
  logPreviewActivity,
  preventConcurrentPreviews,
} = require('@middleware/previewMiddleware');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

// Debug params at router level
router.use((req, res, next) => {
  logger.info('Raw params at router level', { params: req.params, url: req.originalUrl });
  next();
});

router.post(
  '/start',
  requireMerchantRole,
  (req, res, next) => {
    logger.info('Debugging /start route', { params: req.params, url: req.originalUrl });
    const merchantId = parseInt(req.params.merchantId);
    if (isNaN(merchantId)) {
      logger.error('Invalid merchantId detected', { params: req.params });
      return next(new AppError('Invalid merchant ID', 400, 'INVALID_MERCHANT_ID'));
    }
    req.merchantId = merchantId;
    next();
  },
  preventConcurrentPreviews,
  logPreviewActivity('PREVIEW_START_ATTEMPT'),
  catchAsync(PreviewController.startPreview)
);

router.patch(
  '/update',
  requireMerchantRole,
  validatePreviewSession,
  restrictToPreviewOwner,
  catchAsync(PreviewController.updatePreview)
);

router.delete(
  '/end',
  requireMerchantRole,
  validatePreviewSession,
  restrictToPreviewOwner,
  logPreviewActivity('PREVIEW_END_ATTEMPT'),
  catchAsync(PreviewController.endPreview)
);

router.get(
  '/',
  requireMerchantRole,
  validatePreviewSession,
  restrictToPreviewOwner,
  catchAsync(PreviewController.getPreview)
);

module.exports = router;
