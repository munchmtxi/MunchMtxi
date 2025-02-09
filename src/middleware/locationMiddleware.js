// src/middleware/locationMiddleware.js
const locationDetectionService = require('@services/geoLocation/locationDetectionService');
const catchAsync = require('@utils/catchAsync');

exports.detectLocation = catchAsync(async (req, res, next) => {
  if (!req.user) return next();

  const ip = req.ip || req.connection.remoteAddress;
  const lastUpdate = req.user.location_updated_at;
  const updateInterval = 24 * 60 * 60 * 1000; // 24 hours

  // Only update location if it's been more than 24 hours or no location exists
  if (!lastUpdate || (Date.now() - new Date(lastUpdate)) > updateInterval) {
    try {
      const locationData = await locationDetectionService.detectLocationFromIP(ip);
      await locationDetectionService.updateUserLocation(req.user.id, locationData, 'ip');
    } catch (error) {
      // Don't block the request if location detection fails
      console.error('Location detection failed:', error);
    }
  }

  next();
});