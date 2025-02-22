// src/controllers/merchantControllers/profileControllers/draftController.js
const catchAsync = require('@utils/catchAsync');
const { validateDraft } = require('@validators/merchantValidators/profileValidators/draftValidator');
const draftService = require('@services/merchantServices/profileServices/draftService');
const AppError = require('@utils/AppError');

exports.saveDraft = catchAsync(async (req, res) => {
  const { error, value } = validateDraft(req.body);
  
  if (error) {
    throw new AppError(
      error.details[0].message,
      400,
      'VALIDATION_ERROR',
      error.details
    );
  }

  const draft = await draftService.createOrUpdateDraft(
    req.params.merchantId,
    req.user.id,
    value,
    req.headers.authorization
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      draft
    }
  });
});

exports.getDraft = catchAsync(async (req, res) => {
  const draft = await draftService.getDraft(req.params.merchantId);
  
  res.status(200).json({
    status: 'success',
    data: {
      draft
    }
  });
});

exports.submitDraft = catchAsync(async (req, res) => {
  const draft = await draftService.submitDraft(
    req.params.merchantId,
    req.user.id
  );
  
  res.status(200).json({
    status: 'success',
    data: {
      draft
    }
  });
});