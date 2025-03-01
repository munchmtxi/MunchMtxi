// src/middleware/locationMiddleware.js
const locationDetectionService = require('@services/geoLocation/locationDetectionService');
const catchAsync = require('@utils/catchAsync');
const logger = require('@utils/logger');
const { getTimeDifference } = require('@utils/dateTimeUtils'); // Assuming dateTimeUtils.js is added

/**
 * Middleware to detect and update user location based on IP address or other sources.
 * @module locationMiddleware
 */

/**
 * Configuration options for location detection middleware.
 * @typedef {Object} LocationConfig
 * @property {number} updateInterval - Interval in milliseconds to refresh location (default: 24 hours).
 * @property {string[]} allowedSources - Allowed location update sources (e.g., ['ip', 'gps']).
 */

/**
 * Default configuration for location detection.
 * @type {LocationConfig}
 */
const defaultConfig = {
  updateInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  allowedSources: ['ip']
};

/**
 * Middleware to detect and update a user's location if conditions are met.
 * @function detectLocation
 * @param {LocationConfig} [config=defaultConfig] - Configuration options for location updates.
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Updates the user's location based on IP if not recently updated or missing.
 */
exports.detectLocation = (config = defaultConfig) => catchAsync(async (req, res, next) => {
  const { updateInterval, allowedSources } = { ...defaultConfig, ...config };

  // Skip if no user is authenticated
  if (!req.user) {
    logger.debug('No user authenticated, skipping location detection');
    return next();
  }

  const userId = req.user.id;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const lastUpdate = req.user.location_updated_at;

  // Validate user ID and last update timestamp
  if (!userId || typeof userId !== 'string') {
    logger.warn('Invalid user ID in request');
    return next();
  }

  const shouldUpdateLocation = !lastUpdate || 
    (getTimeDifference(lastUpdate, Date.now()) * 1000 > updateInterval);

  if (!shouldUpdateLocation) {
    logger.debug(`User ${userId} location up-to-date, last updated: ${lastUpdate}`);
    return next();
  }

  try {
    // Detect location from IP
    const locationData = await locationDetectionService.detectLocationFromIP(ip);
    if (!locationData || !locationData.latitude || !locationData.longitude) {
      throw new Error('Invalid location data returned');
    }

    // Update user location with source tracking
    const source = 'ip';
    if (!allowedSources.includes(source)) {
      throw new Error(`Location source '${source}' not allowed`);
    }

    await locationDetectionService.updateUserLocation(userId, locationData, source);
    logger.info(`Location updated for user ${userId} from ${source}: ${JSON.stringify(locationData)}`);
  } catch (error) {
    // Log error but don't block request
    logger.error(`Location update failed for user ${userId}: ${error.message}`, {
      stack: error.stack,
      ip,
      userId
    });
  }

  next();
});

/**
 * Middleware to validate and attach geolocation data from request headers.
 * @function attachGeoLocation
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Attaches latitude/longitude from headers if provided, for manual location updates.
 */
exports.attachGeoLocation = catchAsync(async (req, res, next) => {
  const lat = req.headers['x-geo-latitude'];
  const lon = req.headers['x-geo-longitude'];

  if (lat && lon) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);

    if (isNaN(latitude) || isNaN(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      logger.warn('Invalid geolocation headers provided', { lat, lon });
    } else {
      req.geoLocation = { latitude, longitude, source: 'header' };
      logger.debug(`Geo-location attached from headers: ${latitude}, ${longitude}`);
    }
  }

  next();
});

/**
 * Middleware to force update user location regardless of last update time.
 * @function forceUpdateLocation
 * @param {LocationConfig} [config=defaultConfig] - Configuration options.
 * @returns {import('express').RequestHandler} Express middleware function.
 * @description Forces location update using IP or attached geo data.
 */
exports.forceUpdateLocation = (config = defaultConfig) => catchAsync(async (req, res, next) => {
  const { allowedSources } = { ...defaultConfig, ...config };

  if (!req.user) {
    logger.debug('No user authenticated, skipping forced location update');
    return next();
  }

  const userId = req.user.id;
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';

  try {
    let locationData;
    let source;

    // Prefer attached geo data (e.g., from headers) if available
    if (req.geoLocation && allowedSources.includes(req.geoLocation.source)) {
      locationData = req.geoLocation;
      source = req.geoLocation.source;
    } else if (allowedSources.includes('ip')) {
      locationData = await locationDetectionService.detectLocationFromIP(ip);
      source = 'ip';
    } else {
      throw new Error('No valid location source available');
    }

    if (!locationData.latitude || !locationData.longitude) {
      throw new Error('Invalid location data');
    }

    await locationDetectionService.updateUserLocation(userId, locationData, source);
    logger.info(`Forced location update for user ${userId} from ${source}: ${JSON.stringify(locationData)}`);
  } catch (error) {
    logger.error(`Forced location update failed for user ${userId}: ${error.message}`, {
      stack: error.stack,
      ip,
      userId
    });
  }

  next();
});