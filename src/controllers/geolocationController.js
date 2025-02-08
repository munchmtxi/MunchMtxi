const catchAsync = require('@utils/catchAsync');
const geolocation1Service = require('@services/geoLocation/geolocation1Service');
const geolocation2Service = require('@services/geoLocation/geolocation2Service');
const geolocation3Service = require('@services/geoLocation/geolocation3Service');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

// Address and Location Validation Controllers (Using Geolocation1Service)
exports.validateAddress = catchAsync(async (req, res) => {
  const { address, countryCode } = req.body;
  const validatedAddress = await geolocation1Service.validateAddress(
    address,
    countryCode.toUpperCase()
  );
  res.status(200).json({
    status: 'success',
    data: validatedAddress
  });
});

exports.validateMultipleAddresses = catchAsync(async (req, res) => {
  const { addresses, countryCode } = req.body;
  const validatedAddresses = await geolocation1Service.validateMultipleAddresses(
    addresses,
    countryCode.toUpperCase()
  );
  res.status(200).json({
    status: 'success',
    data: validatedAddresses
  });
});

exports.reverseGeocode = catchAsync(async (req, res) => {
  const { latitude, longitude } = req.body;
  const address = await geolocation1Service.reverseGeocode(latitude, longitude);
  res.status(200).json({
    status: 'success',
    data: address
  });
});

// Route and Driver Related Controllers (Using Geolocation2Service)
exports.calculateDriverRoute = catchAsync(async (req, res) => {
  const { origin, destination, waypoints } = req.body;

  // Ensure the requesting user is a driver
  if (req.user.role !== 'driver') {
    throw new AppError('Route calculation is only available for drivers', 403);
  }
  const route = await geolocation2Service.calculateRouteForDriver(
    origin,
    destination,
    waypoints
  );
  res.status(200).json({
    status: 'success',
    data: route
  });
});

exports.calculateDeliveryTimeWindows = catchAsync(async (req, res) => {
  const { origin, destinations } = req.body;
  // Validate user permissions
  if (!['driver', 'merchant', 'admin'].includes(req.user.role)) {
    throw new AppError('Unauthorized access to delivery time calculation', 403);
  }
  const timeWindows = await geolocation2Service.calculateDeliveryTimeWindows(
    origin,
    destinations
  );
  res.status(200).json({
    status: 'success',
    data: timeWindows
  });
});

exports.optimizeMultipleDeliveries = catchAsync(async (req, res) => {
  const { driverLocation, deliveries } = req.body;
  // Ensure proper authorization
  if (!['driver', 'merchant', 'admin'].includes(req.user.role)) {
    throw new AppError('Unauthorized access to delivery optimization', 403);
  }
  const optimizedRoute = await geolocation2Service.optimizeMultipleDeliveries(
    driverLocation,
    deliveries
  );
  res.status(200).json({
    status: 'success',
    data: optimizedRoute
  });
});

// Geofencing and Area Analysis Controllers (Using Geolocation3Service)
exports.createGeofence = catchAsync(async (req, res) => {
  const { coordinates, name } = req.body;
  // Only merchants and admins can create geofences
  if (!['merchant', 'admin'].includes(req.user.role)) {
    throw new AppError('Unauthorized access to geofence creation', 403);
  }
  const geofence = await geolocation3Service.createGeofence(coordinates, name);
  res.status(200).json({
    status: 'success',
    data: geofence
  });
});

exports.checkDeliveryArea = catchAsync(async (req, res) => {
  const { point, geofenceId } = req.body;
  const isInDeliveryArea = await geolocation3Service.isPointInDeliveryArea(
    point,
    geofenceId
  );
  res.status(200).json({
    status: 'success',
    data: { isInDeliveryArea }
  });
});

exports.analyzeDeliveryHotspots = catchAsync(async (req, res) => {
  const { deliveryHistory, timeframe } = req.body;
  // Only merchants and admins can analyze delivery hotspots
  if (!['merchant', 'admin'].includes(req.user.role)) {
    throw new AppError('Unauthorized access to delivery analytics', 403);
  }
  const hotspots = await geolocation3Service.analyzeDeliveryHotspots(
    deliveryHistory,
    timeframe
  );
  res.status(200).json({
    status: 'success',
    data: hotspots
  });
});

// Error handling for unsupported operations
exports.handleUnsupportedOperation = (req, res) => {
  throw new AppError('This operation is not supported', 400);
};

// Health check endpoint for geolocation services
exports.checkGeolocationHealth = catchAsync(async (req, res) => {
  const health = {
    addressService: await geolocation1Service.checkHealth(),
    routeService: await geolocation2Service.checkHealth(),
    geofenceService: await geolocation3Service.checkHealth()
  };
  res.status(200).json({
    status: 'success',
    data: health
  });
});

exports.batchCalculateRoutes = catchAsync(async (req, res) => {
  const { routes } = req.body; // Array of {origin, destination, waypoints}

  if (!['driver', 'merchant', 'admin'].includes(req.user.role)) {
    throw new AppError('Unauthorized access to batch route calculation', 403);
  }
  const calculatedRoutes = await Promise.all(
    routes.map(route =>
      geolocation2Service.calculateRouteForDriver(
        route.origin,
        route.destination,
        route.waypoints
      )
    )
  );
  res.status(200).json({
    status: 'success',
    data: calculatedRoutes
  });
});

// Additional Geofence Operations
exports.getGeofenceDetails = catchAsync(async (req, res) => {
  const { geofenceId } = req.params;
  const geofenceDetails = await geolocation3Service.getGeofenceDetails(geofenceId);
  res.status(200).json({
    status: 'success',
    data: geofenceDetails
  });
});

exports.updateGeofence = catchAsync(async (req, res) => {
  const { geofenceId } = req.params;
  const { coordinates, name } = req.body;
  if (!['merchant', 'admin'].includes(req.user.role)) {
    throw new AppError('Unauthorized access to geofence update', 403);
  }
  const updatedGeofence = await geolocation3Service.updateGeofence(
    geofenceId,
    coordinates,
    name
  );
  res.status(200).json({
    status: 'success',
    data: updatedGeofence
  });
});

// Time-based Analysis
exports.getTimeframeAnalysis = catchAsync(async (req, res) => {
  const { startTime, endTime, geofenceId } = req.body;
  if (!['merchant', 'admin'].includes(req.user.role)) {
    throw new AppError('Unauthorized access to timeframe analysis', 403);
  }
  const analysis = await geolocation3Service.analyzeTimeframe(
    startTime,
    endTime,
    geofenceId
  );
  res.status(200).json({
    status: 'success',
    data: analysis
  });
});

// Enhanced error handling
exports.handleGeolocationError = (err, req, res, next) => {
  logger.error('Geolocation error:', {
    error: err.message,
    endpoint: req.originalUrl,
    method: req.method,
    user: req.user?.id
  });
  if (err.name === 'GoogleMapsError') {
    return res.status(503).json({
      status: 'error',
      message: 'External geolocation service unavailable'
    });
  }
  next(err);
};