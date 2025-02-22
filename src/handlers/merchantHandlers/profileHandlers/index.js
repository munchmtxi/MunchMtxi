// @handlers/merchantHandlers/profileHandlers/index.js
const activityHandlers = require('./activityHandlers');
const bannerHandlers = require('./bannerHandlers');
const businessTypeHandlers = require('./businessTypeHandlers');
const draftHandlers = require('./draftHandlers');
const createGetProfileHandler = require('./getProfileHandler');
const imageUploadHandler = require('./imageUploadHandler');
const merchant2FAHandler = require('./merchant2FAHandler');
const passwordHandler = require('./passwordHandler');
const createPerformanceMetricsHandler = require('./performanceMetricsHandler');
const previewHandlers = require('./previewHandlers');
const profileAnalyticsHandler = require('./profileAnalyticsHandler');
const profileHandlers = require('./profileHandlers');

class MerchantProfileHandlers {
  constructor(io) {
    this.io = io;
    this.getProfileHandler = createGetProfileHandler(io);
    this.performanceMetricsHandler = createPerformanceMetricsHandler(io);
  }

  registerSocketHandlers(socket) {
    // Initialize handlers that need socket instance
    activityHandlers.handleActivityStream(socket, this.io);
    bannerHandlers.handleBannerUpdates(socket, this.io);
    businessTypeHandlers.handleBusinessTypeUpdate(socket, this.io);
    businessTypeHandlers.handleBusinessTypePreview(socket);
    businessTypeHandlers.setupMerchantTypeRooms(socket);
    draftHandlers.handleDraftUpdate(socket, this.io);
    draftHandlers.handleDraftSubmit(socket, this.io);

    // Register factory-created handlers
    this.getProfileHandler.register(socket);
    imageUploadHandler.initialize(socket, this.io);
    
    // Register class instance handlers
    merchant2FAHandler.registerHandlers(socket);
    passwordHandler.registerHandlers(socket);
    this.performanceMetricsHandler.register(socket);
    
    // Register event-based handlers
    previewHandlers.handlePreviewStart(socket, this.io);
    previewHandlers.handlePreviewUpdate(socket, this.io);
    previewHandlers.handlePreviewEnd(socket, this.io);
    profileHandlers.handleProfileUpdate(socket, this.io);

    // Analytics handler is already initialized and listening to events
  }

  broadcastMetricsUpdate(merchantId, metricType, data) {
    return this.performanceMetricsHandler.broadcastMetricsUpdate(
      this.io,
      merchantId,
      metricType,
      data
    );
  }

  handleSuspiciousActivity(socket, merchantId) {
    return merchant2FAHandler.handleSuspiciousActivity(socket, merchantId);
  }
}

module.exports = MerchantProfileHandlers;