// @validators/merchantValidators/profileValidators/index.js

/**
 * Activity Validators
 * Validates activity log queries with date ranges, event types, and pagination
 */
const activityValidator = require('./activityValidator');

/**
 * Address Validators
 * Validates address suggestions and place details for merchant locations
 */
const addressValidator = require('./addressValidator');

/**
 * Banner Validators
 * Validates banner uploads, updates, and display order management
 */
const bannerValidator = require('./bannerValidator');

/**
 * Business Type Validators
 * Validates business type updates, requirements, and configuration
 */
const businessTypeValidator = require('./businessTypeValidator');

/**
 * Draft Validators
 * Validates merchant profile draft changes and submissions
 */
const draftValidator = require('./draftValidator');

/**
 * Get Profile Validators
 * Validates profile retrieval requests
 */
const GetProfileValidator = require('./getProfileValidator');

/**
 * Image Validators
 * Validates image uploads for logos, banners, and storefronts
 */
const imageValidator = require('./imageValidator');

/**
 * 2FA Validators
 * Validates two-factor authentication setup, verification, and management
 */
const merchant2FAValidator = require('./merchant2FAValidator');

/**
 * Password Validators
 * Validates password changes, strength calculations, and security requirements
 */
const passwordValidator = require('./passwordValidator');

/**
 * Performance Metrics Validators
 * Validates metrics requests, date ranges, and calculation parameters
 */
const performanceMetricsValidator = require('./performanceMetricsValidator');

/**
 * Preview Validators
 * Validates profile preview updates and configurations
 */
const previewValidator = require('./previewValidator');

/**
 * Profile Analytics Validators
 * Validates analytics tracking, viewer data, and metrics calculations
 */
const profileAnalyticsValidator = require('./profileAnalyticsValidator');

module.exports = {
  // Activity validation
  validateActivityQuery: activityValidator.validateActivityQuery,

  // Address validation
  addressValidation: {
    suggestionSchema: addressValidator.addressSuggestionSchema,
    detailsSchema: addressValidator.addressDetailsSchema
  },

  // Banner validation
  bannerValidation: {
    validateBanner: bannerValidator.validateBanner,
    validateBannerOrder: bannerValidator.validateBannerOrder
  },

  // Business type validation
  businessTypeValidation: {
    validateUpdate: businessTypeValidator.validateBusinessTypeUpdate,
    validatePreview: businessTypeValidator.validatePreviewRequest,
    validatePartial: businessTypeValidator.validatePartialUpdate
  },

  // Draft validation
  validateDraft: draftValidator.validateDraft,

  // Profile validation
  profileValidator: new GetProfileValidator(),

  // Image validation
  validateImageType: imageValidator.validateImageType,

  // 2FA validation
  twoFactorValidation: {
    validateSetup: merchant2FAValidator.validate2FASetup,
    validateVerification: merchant2FAValidator.validate2FAVerification,
    validateMethodUpdate: merchant2FAValidator.validateMethodUpdate,
    validateBackupEmail: merchant2FAValidator.validateBackupEmail,
    validateBackupPhone: merchant2FAValidator.validateBackupPhone
  },

  // Password validation
  passwordValidation: {
    validateChange: passwordValidator.validatePasswordChange,
    calculateStrength: passwordValidator.calculateStrength,
    getRecommendations: passwordValidator.getStrengthRecommendations
  },

  // Performance metrics validation
  metricsValidation: {
    validateRequest: performanceMetricsValidator.validateMetricsRequest,
    validateRecalculation: performanceMetricsValidator.validateRecalculationRequest,
    validateDate: performanceMetricsValidator.isValidDate,
    handleValidation: performanceMetricsValidator.handleValidationResult
  },

  // Preview validation
  validatePreviewUpdate: previewValidator.validatePreviewUpdate,

  // Analytics validation
  analyticsValidation: {
    validateRecordView: profileAnalyticsValidator.validateRecordView,
    validateUpdateView: profileAnalyticsValidator.validateUpdateView,
    validateSummary: profileAnalyticsValidator.validateAnalyticsSummary,
    validateDetailed: profileAnalyticsValidator.validateDetailedAnalytics,
    validateDemographics: profileAnalyticsValidator.validateDemographics,
    validateInteractions: profileAnalyticsValidator.validateInteractionMetrics,
    validateActiveViewers: profileAnalyticsValidator.validateActiveViewers,
    validateLocation: profileAnalyticsValidator.validateLocationData,
    handleValidation: profileAnalyticsValidator.handleValidationResult
  }
};