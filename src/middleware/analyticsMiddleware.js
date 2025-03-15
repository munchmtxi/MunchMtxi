'use strict';
const profileAnalyticsService = require('@services/merchant/profile/profileAnalyticsService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const trackAnalytics = () => {
  return async (req, res, next) => {
    try {
      logger.debug('Entering trackAnalytics', { method: req.method, url: req.url });

      const merchantId = req.params.merchantId || req.body.merchantId;
      if (!merchantId) {
        logger.debug('No merchantId found for analytics tracking', { method: req.method, url: req.url });
        return next();
      }
      logger.debug('Merchant ID extracted', { merchantId });

      const viewerId = req.user?.id || null;
      const deviceInfo = {
        deviceId: req.headers['x-device-id'] || req.body.deviceId,
        deviceType: req.headers['x-device-type'] || req.body.deviceType || 'unknown'
      };
      const source = req.headers['referer'] ? 'referral' : 'direct';
      const locationData = req.geoLocation || null;
      logger.debug('Analytics data gathered', { merchantId, viewerId, deviceType: deviceInfo.deviceType });

      logger.info('Tracking profile view', { merchantId, viewerId, source, deviceType: deviceInfo.deviceType });
      logger.debug('Before recordProfileView', { merchantId });
      const analytics = await profileAnalyticsService.recordProfileView({
        merchantId,
        viewerId,
        source,
        deviceType: deviceInfo.deviceType,
        locationData
      });
      logger.debug('After recordProfileView', { merchantId, sessionId: analytics.session_id });

      if (req.io && req.socketId) {
        logger.debug('Before trackActiveViewer', { merchantId, socketId: req.socketId });
        await profileAnalyticsService.trackActiveViewer({
          merchantId,
          viewerId,
          socketId: req.socketId,
          viewerType: viewerId ? 'customer' : 'guest'
        });
        logger.debug('After trackActiveViewer', { merchantId });
      }

      req.analytics = {
        sessionId: analytics.session_id,
        merchantId,
        viewerId
      };
      logger.debug('Analytics attached to req', { merchantId });

      next();
    } catch (error) {
      logger.error('Analytics tracking failed', {
        message: error.message,
        merchantId: req.params.merchantId || req.body.merchantId,
        viewerId: req.user?.id,
        stack: error.stack
      });
      next();
    }
  };
};

module.exports = { trackAnalytics };