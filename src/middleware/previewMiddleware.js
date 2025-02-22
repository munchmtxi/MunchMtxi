// src/middleware/previewMiddleware.js
const previewService = require('@services/merchantServices/profileServices/previewService');
const AppError = require('@utils/AppError');

exports.checkActivePreview = async (req, res, next) => {
  const previewSession = previewService.getPreviewSession(req.params.merchantId);
  if (previewSession && previewSession.userId !== req.user.id) {
    return next(new AppError(
      'Another user is currently previewing these changes',
      409,
      'PREVIEW_IN_PROGRESS'
    ));
  }
  next();
};