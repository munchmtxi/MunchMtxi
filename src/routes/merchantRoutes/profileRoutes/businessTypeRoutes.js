// src/routes/merchantRoutes/profileRoutes/businessTypeRoutes.js
const express = require('express');
const {
  authenticate,
  hasMerchantPermission,
  isResourceOwner,
  checkRoleBasedRateLimit
} = require('@middleware/authMiddleware');
const { validateRequest } = require('@middleware/validateRequest');
const {
  updateBusinessType,
  getBusinessTypeRequirements,
  validateBusinessTypeConfig,
  previewBusinessTypeChange
} = require('@controllers/merchantControllers/profileControllers/businessTypeController');
const {
  validateBusinessTypeUpdate,
  validatePreviewRequest
} = require('@validators/merchantValidators/profileValidators/businessTypeValidator');
const {
  validateBusinessTypeAccess,
  checkBusinessTypeExists,
  validateTypeTransition,
  validateRequiredLicenses,
  validateServiceTypes,
  cacheBusinessTypeRequirements
} = require('@middleware/businessTypeMiddleware');

const router = express.Router({ mergeParams: true });

// Apply common middleware
router.use([
  authenticate,
  checkRoleBasedRateLimit('merchant')
]);

// Business type management routes
router
  .route('/')
  .put(
    hasMerchantPermission('profile.edit'),
    isResourceOwner,
    validateBusinessTypeAccess,
    validateTypeTransition,
    validateRequiredLicenses,
    validateServiceTypes,
    validateRequest(validateBusinessTypeUpdate),
    updateBusinessType
  );

router
  .route('/requirements/:businessType')
  .get(
    hasMerchantPermission('profile.view'),
    checkBusinessTypeExists,
    cacheBusinessTypeRequirements,
    getBusinessTypeRequirements
  );

router
  .route('/validate')
  .get(
    hasMerchantPermission('profile.view'),
    isResourceOwner,
    validateBusinessTypeConfig
  );

router
  .route('/preview')
  .post(
    hasMerchantPermission('profile.view'),
    isResourceOwner,
    validateRequest(validatePreviewRequest),
    previewBusinessTypeChange
  );

module.exports = router;
