const { detectLocation, attachGeoLocation } = require('@middleware/locationMiddleware');
const { logger } = require('@utils/logger');

// Debug: Verify logger functionality
if (!logger || typeof logger.info !== 'function') {
  console.error('Logger is not properly initialized in geolocationMiddlewareSetup.js', { logger });
  throw new Error('Logger initialization failed');
}

module.exports = {
  setupGeolocationMiddleware: (app) => {
    logger.info('Setting up geolocation-specific middleware...');
    app.use(detectLocation({
      allowedSources: ['ip', 'gps', 'header'],
      updateInterval: 12 * 60 * 60 * 1000 // 12 hours
    }));
    logger.info('Geolocation detection middleware applied');
    app.use(attachGeoLocation);
    logger.info('Geolocation header attachment middleware applied');
    logger.info('Geolocation middleware setup complete');
  }
};