// C:\Users\munch\Desktop\MunchMtxi\src/validators/geolocationValidators.js

const { body, param } = require('express-validator');
const countries = require('@config/countryConfigs');

exports.validateAddressRequest = [
  body('address')
    .trim()
    .notEmpty().withMessage('Address is required')
    .isString().withMessage('Address must be a string'),
    
  body('countryCode')
    .trim()
    .notEmpty().withMessage('Country code is required')
    .isString().withMessage('Country code must be a string')
    .isLength({ min: 3, max: 3 }).withMessage('Country code must be 3 characters')
    .custom(value => {
      if (!countries[value.toUpperCase()]) {
        throw new Error('Unsupported country code');
      }
      return true;
    })
];

exports.validateRouteRequest = [
  body('origin')
    .trim()
    .notEmpty().withMessage('Origin address is required')
    .isString().withMessage('Origin must be a string'),
    
  body('destination')
    .trim()
    .notEmpty().withMessage('Destination address is required')
    .isString().withMessage('Destination must be a string'),
    
  body('waypoints')
    .optional()
    .isArray().withMessage('Waypoints must be an array')
    .custom(value => {
      if (value && !value.every(point => typeof point === 'string')) {
        throw new Error('All waypoints must be strings');
      }
      return true;
    })
];

exports.validateMultipleAddressesRequest = [
  body('addresses')
    .isArray({ min: 1 }).withMessage('Addresses must be a non-empty array')
    .custom(addresses => {
      if (!addresses.every(address => typeof address === 'string' && address.trim() !== '')) {
        throw new Error('Each address must be a non-empty string');
      }
      return true;
    }),
  body('countryCode')
    .trim()
    .notEmpty().withMessage('Country code is required')
    .isString().withMessage('Country code must be a string')
    .isLength({ min: 3, max: 3 }).withMessage('Country code must be 3 characters')
    .custom(value => {
      if (!countries[value.toUpperCase()]) {
        throw new Error('Unsupported country code');
      }
      return true;
    })
];

exports.validateReverseGeocodeRequest = [
  body('latitude')
    .notEmpty().withMessage('Latitude is required')
    .isFloat().withMessage('Latitude must be a number'),
  body('longitude')
    .notEmpty().withMessage('Longitude is required')
    .isFloat().withMessage('Longitude must be a number')
];

exports.validateDeliveryTimeWindowsRequest = [
  body('origin')
    .trim()
    .notEmpty().withMessage('Origin address is required')
    .isString().withMessage('Origin must be a string'),
  body('destinations')
    .isArray({ min: 1 }).withMessage('Destinations must be a non-empty array')
    .custom(destinations => {
      if (!destinations.every(dest => typeof dest === 'string' && dest.trim() !== '')) {
        throw new Error('Each destination must be a non-empty string');
      }
      return true;
    })
];

exports.validateOptimizeDeliveriesRequest = [
  body('driverLocation')
    .notEmpty().withMessage('Driver location is required')
    .custom(location => {
      if (typeof location !== 'object' || location === null) {
        throw new Error('Driver location must be an object with lat and lng');
      }
      if (typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        throw new Error('Driver location must contain numeric lat and lng');
      }
      return true;
    }),
  body('deliveries')
    .isArray({ min: 1 }).withMessage('Deliveries must be a non-empty array')
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
      }
      return true;
    })
];

exports.validateGeofenceCreationRequest = [
  body('coordinates')
    .isArray({ min: 4 }).withMessage('Coordinates must be an array with at least 4 points (first and last must be equal)')
    .custom(coordinates => {
      for (const point of coordinates) {
        if (typeof point !== 'object' || point === null) {
          throw new Error('Each coordinate must be an object');
        }
        if (typeof point.lat !== 'number' || typeof point.lng !== 'number') {
          throw new Error('Each coordinate must have numeric lat and lng');
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
    .notEmpty().withMessage('Geofence name is required')
    .isString().withMessage('Geofence name must be a string')
];

exports.validateDeliveryAreaRequest = [
  body('point')
    .notEmpty().withMessage('Point is required')
    .custom(point => {
      if (typeof point !== 'object' || point === null) {
        throw new Error('Point must be an object with lat and lng');
      }
      if (typeof point.lat !== 'number' || typeof point.lng !== 'number') {
        throw new Error('Point must contain numeric lat and lng');
      }
      return true;
    }),
  body('geofenceId')
    .notEmpty().withMessage('Geofence ID is required')
];

exports.validateHotspotsRequest = [
  body('deliveryHistory')
    .isArray({ min: 1 }).withMessage('Delivery history must be a non-empty array')
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
      }
      return true;
    }),
  body('timeframe')
    .notEmpty().withMessage('Timeframe is required')
];

exports.validateBatchRoutesRequest = [
  body('routes')
    .isArray({ min: 1 }).withMessage('Routes must be a non-empty array')
    .custom(routes => {
      for (const route of routes) {
        if (typeof route !== 'object' || route === null) {
          throw new Error('Each route must be an object');
        }
        if (!route.origin || typeof route.origin !== 'string') {
          throw new Error('Each route must have an origin string');
        }
        if (!route.destination || typeof route.destination !== 'string') {
          throw new Error('Each route must have a destination string');
        }
        if (route.waypoints && (!Array.isArray(route.waypoints) || !route.waypoints.every(point => typeof point === 'string'))) {
          throw new Error('Waypoints must be an array of strings');
        }
      }
      return true;
    })
];

exports.validateGeofenceDetailsRequest = [
  param('geofenceId')
    .notEmpty().withMessage('Geofence ID is required')
];

exports.validateGeofenceUpdateRequest = [
  param('geofenceId')
    .notEmpty().withMessage('Geofence ID is required'),
  body('coordinates')
    .isArray({ min: 4 }).withMessage('Coordinates must be an array with at least 4 points (first and last must be equal)')
    .custom(coordinates => {
      for (const point of coordinates) {
        if (typeof point !== 'object' || point === null) {
          throw new Error('Each coordinate must be an object');
        }
        if (typeof point.lat !== 'number' || typeof point.lng !== 'number') {
          throw new Error('Each coordinate must have numeric lat and lng');
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
    .notEmpty().withMessage('Geofence name is required')
    .isString().withMessage('Geofence name must be a string')
];

exports.validateTimeframeAnalysisRequest = [
  body('startTime')
    .notEmpty().withMessage('Start time is required')
    .isISO8601().withMessage('Start time must be a valid ISO 8601 date'),
  body('endTime')
    .notEmpty().withMessage('End time is required')
    .isISO8601().withMessage('End time must be a valid ISO 8601 date'),
  body('geofenceId')
    .notEmpty().withMessage('Geofence ID is required')
];
