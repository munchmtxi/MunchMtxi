// src/handlers/profileAnalyticsHandler.js
const { EVENTS } = require('@config/events');
const eventManager = require('@services/eventManager');
const { logger } = require('@utils/logger');

class ProfileAnalyticsHandler {
  constructor() {
    this.registerEventHandlers();
  }

  registerEventHandlers() {
    // Listen for profile analytics updates
    eventManager.on(EVENTS.MERCHANT.PROFILE.ANALYTICS_UPDATED, this.onAnalyticsUpdated);
    // Listen for active viewers updates
    eventManager.on(EVENTS.MERCHANT.PROFILE.ACTIVE_VIEWERS_UPDATED, this.onActiveViewersUpdated);
  }

  /**
   * Handler for profile analytics update events.
   * @param {Object} payload - Contains merchantId, viewerId, and analytics details.
   */
  onAnalyticsUpdated(payload) {
    logger.info(`Profile Analytics updated for Merchant ID: ${payload.merchantId}`);
    // Custom logic can be added here, e.g., update dashboards, send notifications, etc.
  }

  /**
   * Handler for active viewers update events.
   * @param {Object} payload - Contains merchantId and active viewers count.
   */
  onActiveViewersUpdated(payload) {
    logger.info(`Active Viewers updated for Merchant ID: ${payload.merchantId}. Total active viewers: ${payload.activeViewers}`);
    // Custom logic can be added here, e.g., trigger real-time UI updates.
  }
}

// Initialize the handler to start listening for events
module.exports = new ProfileAnalyticsHandler();
