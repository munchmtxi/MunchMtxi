// src/routes/geolocationRoutes.js

const express = require('express');
const router = express.Router();
const geolocationController = require('@controllers/geolocationController');
const { authenticate } = require('@middleware/authMiddleware');
const { validateRequest } = require('@middleware/validateRequest');
const { validateLocationPermissions } = require('@middleware/security');
const { geoLocationLimiter } = require('@middleware/security').rateLimiters;

// Import all validators
const {
  validateAddressRequest,
  validateMultipleAddressesRequest,
  validateReverseGeocodeRequest,
  validateRouteRequest,
  validateDeliveryTimeWindowsRequest,
  validateOptimizeDeliveriesRequest,
  validateGeofenceCreationRequest,
  validateDeliveryAreaRequest,
  validateHotspotsRequest,
  validateBatchRoutesRequest,
  validateGeofenceDetailsRequest,
  validateGeofenceUpdateRequest,
  validateTimeframeAnalysisRequest,
  validateManualLocationRequest,
  validateGPSLocation
} = require('@validators/geolocationValidators');

// All geolocation routes require authentication
router.use(authenticate);

// Rate limiter for specific routes
router.use(geoLocationLimiter);

// Location Detection endpoints
router.get(
  '/detect-location',
  validateLocationPermissions,
  geolocationController.detectCurrentLocation
);

router.post(
  '/set-manual-location',
  validateLocationPermissions,
  validateManualLocationRequest,
  validateRequest, // Changed this line
  geolocationController.setManualLocation
);

router.get(
  '/current-location',
  validateLocationPermissions,
  geolocationController.getCurrentLocation
);

router.post(
  '/gps-location',
  validateLocationPermissions,
  validateGPSLocation,
  validateRequest, // Changed this line
  geolocationController.updateGPSLocation
);

// Commented Routes - To be implemented
// ----------------------------------

/*
// Address Validation Endpoints
router.post(
  '/validate-address',
  validateAddressRequest,
  validate,
  geolocationController.validateAddress
);

router.post(
  '/validate-multiple-addresses',
  validateMultipleAddressesRequest,
  validate,
  geolocationController.validateMultipleAddresses
);

router.post(
  '/reverse-geocode',
  validateReverseGeocodeRequest,
  validate,
  geolocationController.reverseGeocode
);

// Route Calculation Endpoints
router.post(
  '/calculate-route',
  validateRouteRequest,
  validate,
  geolocationController.calculateDriverRoute
);

router.post(
  '/calculate-delivery-time-windows',
  validateDeliveryTimeWindowsRequest,
  validate,
  geolocationController.calculateDeliveryTimeWindows
);

router.post(
  '/optimize-deliveries',
  validateOptimizeDeliveriesRequest,
  validate,
  geolocationController.optimizeMultipleDeliveries
);

// Geofence Operations
router.post(
  '/create-geofence',
  validateGeofenceCreationRequest,
  validate,
  geolocationController.createGeofence
);

router.post(
  '/check-delivery-area',
  validateDeliveryAreaRequest,
  validate,
  geolocationController.checkDeliveryArea
);

router.post(
  '/analyze-delivery-hotspots',
  validateHotspotsRequest,
  validate,
  geolocationController.analyzeDeliveryHotspots
);

// Health Check Endpoint
router.get('/health', geolocationController.checkGeolocationHealth);

// Batch Route Calculation
router.post(
  '/batch-calculate-routes',
  validateBatchRoutesRequest,
  validate,
  geolocationController.batchCalculateRoutes
);

// Geofence Details and Update Endpoints
router.get(
  '/geofences/:geofenceId',
  validateGeofenceDetailsRequest,
  validate,
  geolocationController.getGeofenceDetails
);

router.put(
  '/geofences/:geofenceId',
  validateGeofenceUpdateRequest,
  validate,
  geolocationController.updateGeofence
);

// Timeframe Analysis
router.post(
  '/timeframe-analysis',
  validateTimeframeAnalysisRequest,
  validate,
  geolocationController.getTimeframeAnalysis
);
*/

module.exports = router;