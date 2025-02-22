// @controllers/merchantControllers/profileControllers/index.js

// Import all controllers with their specific export patterns
const activityController = require('./activityController');
const { 
  getAddressSuggestions,
  getAddressDetails,
  updateMerchantAddress 
} = require('./addressController');
const bannerController = require('./bannerController');
const businessTypeController = require('./businessTypeController');
const draftController = require('./draftController');
const GetProfileController = require('./getProfileController');
const { 
  uploadMerchantImage,
  deleteMerchantImage,
  getMerchantImages 
} = require('./imageController');
const merchant2FAController = require('./merchant2FAController');
const passwordController = require('./passwordController');
const PerformanceMetricsController = require('./performanceMetricsController');
const previewController = require('./previewController');
const ProfileAnalyticsController = require('./profileAnalyticsController');

// Export with consistent naming and handle different export patterns
module.exports = {
  // Direct exports
  activityController,
  bannerController,
  businessTypeController,
  draftController,
  passwordController,
  previewController,

  // Class instances
  getProfileController: new GetProfileController(),
  performanceMetricsController: new PerformanceMetricsController(),
  profileAnalyticsController: new ProfileAnalyticsController(),

  // Named exports
  addressController: {
    getAddressSuggestions,
    getAddressDetails,
    updateMerchantAddress
  },
  
  imageController: {
    uploadMerchantImage,
    deleteMerchantImage,
    getMerchantImages
  },

  // Additional exports for direct access to common methods
  getActivityLogs: activityController.getActivityLogs,
  getActivityDetails: activityController.getActivityDetails,
  getActivityStats: activityController.getActivityStats,
  
  updateBusinessType: businessTypeController.updateBusinessType,
  getBusinessTypeRequirements: businessTypeController.getBusinessTypeRequirements,
  
  saveDraft: draftController.saveDraft,
  getDraft: draftController.getDraft,
  submitDraft: draftController.submitDraft,
  
  changePassword: passwordController.changePassword,
  getPasswordHistory: passwordController.getPasswordHistory,
  getPasswordStrength: passwordController.getPasswordStrength
};