// src/controllers/merchantControllers/profileControllers/businessTypeController.js
const catchAsync = require('@utils/catchAsync');
const businessTypeService = require('@services/merchantServices/profileServices/businessTypeService');
const AppError = require('@utils/AppError');
const { BUSINESS_TYPES } = require('@config/constants/businessTypes');

exports.updateBusinessType = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  
  const updatedMerchant = await businessTypeService.updateBusinessType(
    merchantId,
    req.user?.id,
    req.body,
    req.headers?.authorization
  );

  res.status(200).json({
    status: 'success',
    data: {
      merchant: {
        id: updatedMerchant.id,
        business_type: updatedMerchant.business_type,
        business_type_details: updatedMerchant.business_type_details
      }
    }
  });
});

exports.getBusinessTypeRequirements = catchAsync(async (req, res) => {
  const { businessType } = req.params;
  
  const requirements = await businessTypeService.getBusinessTypeRequirements(businessType);

  res.status(200).json({
    status: 'success',
    data: { requirements }
  });
});

exports.validateBusinessTypeConfig = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  
  const validationResult = await businessTypeService.validateBusinessTypeConfig(merchantId);

  res.status(200).json({
    status: 'success',
    data: validationResult
  });
});

exports.previewBusinessTypeChange = catchAsync(async (req, res) => {
  const { merchantId } = req.params;
  const { business_type } = req.body;

  if (!business_type || !business_type.trim()) {
    throw new AppError('Business type is required', 400, 'VALIDATION_ERROR');
  }

  const requirements = await businessTypeService.getBusinessTypeRequirements(business_type);

  res.status(200).json({
    status: 'success',
    data: {
      new_type: business_type,
      requirements,
      required_changes: {
        fields_to_add: requirements.requiredFields || [],
        licenses_needed: requirements.requiredLicenses || [],
        available_service_types: requirements.allowedServiceTypes || []
      }
    }
  });
});
