const { body, param } = require('express-validator');
const countries = require('@config/countryConfigs');

// Validate GPS Location
exports.validateGPSLocation = [
  body('latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('accuracy')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Accuracy must be a positive number'),
  body('speed')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Speed must be a positive number'),
  body('heading')
    .optional()
    .isFloat({ min: 0, max: 360 })
    .withMessage('Heading must be between 0 and 360 degrees'),
  body('timestamp')
    .optional()
    .isISO8601()
    .withMessage('Timestamp must be a valid ISO 8601 date')
];

// Validate Manual Location
exports.validateManualLocation = [
  ...exports.validateGPSLocation,
  body('address')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Address cannot be empty if provided'),
  body('countryCode')
    .isISO31661Alpha2()
    .withMessage('Country code must be a valid ISO 3166-1 Alpha-2 code')
    .custom(value => {
      if (!countries[value.toUpperCase()]) {
        throw new Error('Unsupported country code');
      }
      return true;
    }),
  body('placeId')
    .optional()
    .isString()
    .withMessage('Place ID must be a string'),
  body('formattedAddress')
    .optional()
    .isString()
    .withMessage('Formatted address must be a string'),
  body('components')
    .optional()
    .isObject()
    .withMessage('Address components must be an object')
];

// Validate IP Location (not directly used in routes, but kept for completeness)
exports.validateIPLocation = [
  body('ip')
    .optional()
    .isIP()
    .withMessage('Invalid IP address format'),
  body('fallbackToGPS')
    .optional()
    .isBoolean()
    .withMessage('fallbackToGPS must be a boolean')
];

// Validate Route Request
exports.validateRouteRequest = [
  body('origin')
    .trim()
    .notEmpty()
    .withMessage('Origin address is required')
    .isString()
    .withMessage('Origin must be a string'),
  body('destination')
    .trim()
    .notEmpty()
    .withMessage('Destination address is required')
    .isString()
    .withMessage('Destination must be a string'),
  body('waypoints')
    .optional()
    .isArray()
    .withMessage('Waypoints must be an array')
    .custom(value => {
      if (value && !value.every(point => typeof point === 'string' && point.trim() !== '')) {
        throw new Error('All waypoints must be non-empty strings');
      }
      return true;
    })
];

// Validate Optimize Deliveries Request
exports.validateOptimizeDeliveriesRequest = [
  body('driverLocation')
    .notEmpty()
    .withMessage('Driver location is required')
    .custom(location => {
      if (typeof location !== 'object' || location === null) {
        throw new Error('Driver location must be an object with lat and lng');
      }
      if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        throw new Error('Driver location must contain numeric lat and lng');
      }
      if (location.lat < -90 || location.lat > 90) {
        throw new Error('Driver latitude must be between -90 and 90');
      }
      if (location.lng < -180 || location.lng > 180) {
        throw new Error('Driver longitude must be between -180 and 180');
      }
      return true;
    }),
  body('deliveries')
    .isArray({ min: 1 })
    .withMessage('Deliveries must be a non-empty array')
    .custom(deliveries => {
      for (const delivery of deliveries) {
        if (typeof delivery !== 'object' || delivery === null) {
          throw new Error('Each delivery must be an object');
        }
        if (!delivery.location || typeof delivery.location !== 'object') {
          throw new Error('Each delivery must have a location object');
        }
        if (typeof delivery.location.lat !== 'number' || typeof delivery.location.lng !== 'number') {
          throw new Error('Delivery location must contain numeric lat and lng');
        }
        if (delivery.id && typeof delivery.id !== 'string') {
          throw new Error('Delivery ID must be a string');
        }
        if (delivery.timeWindow && !Date.parse(delivery.timeWindow)) {
          throw new Error('Delivery timeWindow must be a valid date');
        }
        if (delivery.customerTier && !['standard', 'premium'].includes(delivery.customerTier)) {
          throw new Error('Customer tier must be "standard" or "premium"');
        }
        if (delivery.value && (typeof delivery.value !== 'number' || delivery.value < 0)) {
          throw new Error('Delivery value must be a positive number');
        }
      }
      return true;
    })
];

// Validate Delivery Time Windows Request
exports.validateDeliveryTimeWindowsRequest = [
  body('origin')
    .trim()
    .notEmpty()
    .withMessage('Origin address is required')
    .isString()
    .withMessage('Origin must be a string'),
  body('destinations')
    .isArray({ min: 1 })
    .withMessage('Destinations must be a non-empty array')
    .custom(destinations => {
      if (!destinations.every(dest => typeof dest === 'string' && dest.trim() !== '')) {
        throw new Error('Each destination must be a non-empty string');
      }
      return true;
    })
];

// Validate Geofence Creation Request
exports.validateGeofenceCreationRequest = [
  body('coordinates')
    .isArray({ min: 4 })
    .withMessage('Coordinates must be an array with at least 4 points (first and last must be equal)')
    .custom(coordinates => {
      for (const point of coordinates) {
        if (typeof point !== 'object' || point === null) {
          throw new Error('Each coordinate must be an object');
        }
        if (typeof point.lat !== 'number' || typeof point.lng !== 'number') {
          throw new Error('Each coordinate must have numeric lat and lng');
        }
        if (point.lat < -90 || point.lat > 90) {
          throw new Error('Coordinate latitude must be between -90 and 90');
        }
        if (point.lng < -180 || point.lng > 180) {
          throw new Error('Coordinate longitude must be between -180 and 180');
        }
      }
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (first.lat !== last.lat || first.lng !== last.lng) {
        throw new Error('First and last coordinates must be identical to form a closed polygon');
      }
      return true;
    }),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Geofence name is required')
    .isString()
    .withMessage('Geofence name must be a string')
    .isLength({ min: 1, max: 100 })
    .withMessage('Geofence name must be between 1 and 100 characters')
];

// Validate Delivery Area Request
exports.validateDeliveryAreaRequest = [
  body('point')
    .notEmpty()
    .withMessage('Point is required')
    .custom(point => {
      if (typeof point !== 'object' || point === null) {
        throw new Error('Point must be an object with lat and lng');
      }
      if (typeof point.lat !== 'number' || typeof point.lng !== 'number') {
        throw new Error('Point must contain numeric lat and lng');
      }
      if (point.lat < -90 || point.lat > 90) {
        throw new Error('Point latitude must be between -90 and 90');
      }
      if (point.lng < -180 || point.lng > 180) {
        throw new Error('Point longitude must be between -180 and 180');
      }
      return true;
    }),
  body('geofenceId')
    .notEmpty()
    .withMessage('Geofence ID is required')
    .isString()
    .withMessage('Geofence ID must be a string')
];

// Validate Hotspots Request
exports.validateHotspotsRequest = [
  body('deliveryHistory')
    .isArray({ min: 1 })
    .withMessage('Delivery history must be a non-empty array')
    .custom(history => {
      for (const record of history) {
        if (typeof record !== 'object' || record === null) {
          throw new Error('Each delivery record must be an object');
        }
        if (!record.location || typeof record.location !== 'object') {
          throw new Error('Each delivery record must have a location object');
        }
        if (typeof record.location.lat !== 'number' || typeof record.location.lng !== 'number') {
          throw new Error('Delivery record location must have numeric lat and lng');
        }
        if (record.location.lat < -90 || record.location.lat > 90) {
          throw new Error('Delivery latitude must be between -90 and 90');
        }
        if (record.location.lng < -180 || record.location.lng > 180) {
          throw new Error('Delivery longitude must be between -180 and 180');
        }
      }
      return true;
    }),
  body('timeframe')
    .notEmpty()
    .withMessage('Timeframe is required')
    .isString()
    .withMessage('Timeframe must be a string')
    .matches(/^(daily|weekly|monthly|custom)$/)
    .withMessage('Timeframe must be "daily", "weekly", "monthly", or "custom"')
];

// No validation needed for /health as it has no body or params
exports.validateHealthRequest = []; // Placeholder for consistency

// Additional Validators from Original Not Directly Used in Routes (Kept for Completeness)
exports.validateLocationPreferences = [
  body('defaultLocationMethod')
    .optional()
    .isIn(['gps', 'ip', 'manual'])
    .withMessage('Invalid location method'),
  body('autoDetectLocation')
    .optional()
    .isBoolean()
    .withMessage('autoDetectLocation must be a boolean'),
  body('locationUpdateInterval')
    .optional()
    .isInt({ min: 60, max: 86400 })
    .withMessage('Update interval must be between 60 and 86400 seconds')
];

exports.validateAddressRequest = [
  body('address')
    .trim()
    .notEmpty()
    .withMessage('Address is required')
    .isString()
    .withMessage('Address must be a string'),
  body('countryCode')
    .isISO31661Alpha2()
    .withMessage('Country code must be a valid ISO 3166-1 Alpha-2 code')
    .custom(value => {
      if (!countries[value.toUpperCase()]) {
        throw new Error('Unsupported country code');
      }
      return true;
    })
];

exports.validateMultipleAddressesRequest = [
  body('addresses')
    .isArray({ min: 1 })
    .withMessage('Addresses must be a non-empty array')
    .custom(addresses => {
      if (!addresses.every(address => typeof address === 'string' && address.trim() !== '')) {
        throw new Error('Each address must be a non-empty string');
      }
      return true;
    }),
  body('countryCode')
    .isISO31661Alpha2()
    .withMessage('Country code must be a valid ISO 3166-1 Alpha-2 code')
    .custom(value => {
      if (!countries[value.toUpperCase()]) {
        throw new Error('Unsupported country code');
      }
      return true;
    })
];

exports.validateReverseGeocodeRequest = [
  body('latitude')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180')
];