const locationDetectionService = require('@services/geoLocation/locationDetectionService');
const geolocation1Service = require('@services/geoLocation/geolocation1Service');
const geolocation2Service = require('@services/geoLocation/geolocation2Service');
const geolocation3Service = require('@services/geoLocation/geolocation3Service');
const { logger } = require('@utils/logger');

module.exports = {
  setupGeolocationServices: () => {
    const services = {
      locationDetection: locationDetectionService,
      geolocation1: geolocation1Service,
      geolocation2: geolocation2Service,
      geolocation3: geolocation3Service
    };
    logger.info('Geolocation services initialized: LocationDetection, Geolocation1, Geolocation2, Geolocation3');
    return services;
  }
};