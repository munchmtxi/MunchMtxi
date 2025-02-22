// src/controllers/merchantControllers/profileControllers/activityController.js
const catchAsync = require('@utils/catchAsync');
const { validateActivityQuery } = require('@validators/merchantValidators/profileValidators/activityValidator');
const activityLogService = require('@services/merchantServices/profileServices/activityLogService');
const AppError = require('@utils/AppError');

exports.getActivityLogs = catchAsync(async (req, res) => {
  const { error, value } = validateActivityQuery(req.query);
  
  if (error) {
    throw new AppError(
      error.details[0].message,
      400,
      'VALIDATION_ERROR',
      error.details
    );
  }

  const activities = await activityLogService.getProfileActivity(
    req.params.merchantId,
    value
  );

  res.status(200).json({
    status: 'success',
    data: {
      activities
    }
  });
});

exports.getActivityDetails = catchAsync(async (req, res) => {
  const activity = await activityLogService.getActivityById(
    req.params.merchantId,
    req.params.activityId
  );

  if (!activity) {
    throw new AppError(
      'Activity log not found',
      404,
      'ACTIVITY_NOT_FOUND'
    );
  }

  res.status(200).json({
    status: 'success',
    data: {
      activity
    }
  });
});

exports.getActivityStats = catchAsync(async (req, res) => {
  const { error, value } = validateActivityQuery(req.query);
  
  if (error) {
    throw new AppError(
      error.details[0].message,
      400,
      'VALIDATION_ERROR',
      error.details
    );
  }

  const stats = await activityLogService.getActivityStats(
    req.params.merchantId,
    value
  );

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});