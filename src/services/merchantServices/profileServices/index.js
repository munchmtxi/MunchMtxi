// @services/merchantServices/profileServices/index.js

/**
 * Activity Log Service
 * Handles merchant activity logging, tracking, and validation
 */
const activityLogService = require('./activityLogService');

/**
 * Banner Service
 * Manages seasonal banners, banner ordering, and image handling
 */
const bannerService = require('./bannerService');

/**
 * Business Type Service
 * Handles merchant business type configuration and validation
 */
const businessTypeService = require('./businessTypeService');

/**
 * Draft Service
 * Manages merchant profile draft changes and submissions
 */
const draftService = require('./draftService');

/**
 * Get Profile Service
 * Handles merchant profile retrieval and formatting
 */
const getProfileService = require('./getProfileService');

/**
 * Image Service
 * Manages merchant image uploads, processing, and storage
 */
const imageService = require('./imageService');

/**
 * Maps Service
 * Handles location-based services and address validation
 */
const mapsService = require('./mapsService');

/**
 * Merchant 2FA Service
 * Manages two-factor authentication setup and verification
 */
const merchant2FAService = require('./merchant2FAService');

/**
 * Merchant Password Service
 * Handles password management, security, and history
 */
const merchantPasswordService = require('./merchantPasswordService');

/**
 * Performance Metrics Service
 * Calculates and tracks merchant performance metrics
 */
const performanceMetricsService = require('./performanceMetricsService');

/**
 * Preview Service
 * Manages merchant profile preview sessions
 */
const previewService = require('./previewService');

/**
 * Profile Service
 * Handles merchant profile updates and validation
 */
const profileService = require('./profileService');

/**
 * Profile Analytics Service
 * Tracks and analyzes merchant profile engagement
 */
const profileAnalyticsService = require('./profileAnalyticsService');

// Export all services with clear documentation
module.exports = {
  // Core profile services
  profileService,
  getProfileService,
  
  // Security services
  merchant2FAService,
  merchantPasswordService,
  
  // Media services
  imageService,
  bannerService,
  
  // Analytics and metrics
  profileAnalyticsService,
  performanceMetricsService,
  activityLogService,
  
  // Configuration services
  businessTypeService,
  draftService,
  previewService,
  
  // Location services
  mapsService
};