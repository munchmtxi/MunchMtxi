// src/controllers/merchantControllers/profileControllers/previewController.js 
const catchAsync = require('@utils/catchAsync');
const previewService = require('@services/merchantServices/profileServices/previewService');

exports.startPreview = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const result = await previewService.startPreview(merchantId, req.body);
  
  res.status(200).json({
    status: 'success',
    data: result
  });
});

exports.getPreview = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const preview = await previewService.getPreview(merchantId);

  res.status(200).json({
    status: 'success',
    data: { preview }
  });
});

exports.updatePreview = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const updated = await previewService.updatePreview(merchantId, req.body);

  res.status(200).json({
    status: 'success',
    data: { preview: updated }
  });
});

exports.endPreview = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  await previewService.endPreview(merchantId);

  res.status(200).json({
    status: 'success',
    message: 'Preview session ended'
  });
});

exports.sharePreview = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { userId } = req.body;
  const result = await previewService.sharePreview(merchantId, userId);

  res.status(200).json({
    status: 'success',
    data: result
  });
});

exports.revokePreviewAccess = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { userId } = req.body;
  await previewService.revokeAccess(merchantId, userId);

  res.status(200).json({
    status: 'success',
    message: 'Preview access revoked'
  });
});

exports.getPreviewStatus = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const status = await previewService.getStatus(merchantId);

  res.status(200).json({
    status: 'success',
    data: { status }
  });
});