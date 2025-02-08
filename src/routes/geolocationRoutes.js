// C:\Users\munch\Desktop\MunchMtxi\src/routes/geolocationRoutes.js

const express = require('express');
const router = express.Router();
const geolocationController = require('@controllers/geolocationController');
const { authenticate } = require('@middleware/authMiddleware'); // Updated import: using 'authenticate'
const validate = require('@middleware/validateRequest');

// Import all validators (ensure these are defined in your project)
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
  validateTimeframeAnalysisRequest
} = require('@validators/geolocationValidators');

// All geolocation routes require authentication
router.use(authenticate); // Using authenticate from authMiddleware

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
router.get(
  '/health',
  geolocationController.checkGeolocationHealth
);

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

module.exports = router;
