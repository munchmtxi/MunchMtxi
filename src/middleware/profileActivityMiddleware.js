// src/middleware/profileActivityMiddleware.js
const ProfileActivityLogService = require('@services/merchantServices/profileServices/activityLogService');

exports.trackProfileActivity = (eventType) => async (req, res, next) => {
  const originalSend = res.send;

  res.send = async function(data) {
    try {
      // Only log on successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        await ProfileActivityLogService.logProfileActivity({
          merchantId: req.params.merchantId,
          actorId: req.user.id,
          eventType,
          changes: req.body, // The changes being made
          deviceInfo: req.deviceInfo, // From your deviceDetectionMiddleware
          metadata: {
            path: req.path,
            method: req.method,
            ip: req.ip,
            userAgent: req.get('user-agent')
          }
        });
      }
    } catch (error) {
      // Log error but don't block the response
      console.error('Error logging profile activity:', error);
    }

    // Call original send
    originalSend.apply(res, arguments);
  };

  next();
};