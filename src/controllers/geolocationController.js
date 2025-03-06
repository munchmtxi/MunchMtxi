const catchAsync = require('@utils/catchAsync');
const locationDetectionService = require('@services/geoLocation/locationDetectionService');
const geolocation1Service = require('@services/geoLocation/geolocation1Service');
const geolocation2Service = require('@services/geoLocation/geolocation2Service');
const geolocation3Service = require('@services/geoLocation/geolocation3Service');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

// Geolocation Controller
// IP-based Location Detection
exports.detectCurrentLocation = catchAsync(async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  logger.info('Detecting current location from IP', { userId: req.user.id, ip });

  const locationData = await locationDetectionService.detectLocationFromIP(ip);
  if (!locationData.countryCode) {
    throw new AppError('Location detection failed - country not supported', 400);
  }

  const updatedUser = await locationDetectionService.updateUserLocation(req.user.id, locationData, 'ip');
  res.status(200).json({
    status: 'success',
    data: {
      location: {
        latitude: locationData.latitude,
        longitude: locationData.longitude,
        country: locationData.country,
        countryCode: locationData.countryCode,
        city: locationData.city,
        region: locationData.region,
        timezone: locationData.timezone
      },
      source: 'ip',
      accuracy: 'low', // IP-based typically has lower accuracy
      timestamp: new Date(),
      lastUpdate: updatedUser.location_updated_at
    }
  });
});

// Manual Location Setting with Validation (Geolocation1Service)
exports.setManualLocation = catchAsync(async (req, res) => {
  const { latitude, longitude, address, countryCode } = req.body;
  logger.info('Setting manual location', { userId: req.user.id, coordinates: { latitude, longitude } });

  const locationData = { latitude, longitude, address, countryCode, setAt: new Date(), source: 'manual', accuracy: 'high' };
  const validatedAddress = await geolocation1Service.validateAddress(address, countryCode.toUpperCase());

  if (validatedAddress.status !== 'VALID') {
    return res.status(200).json({
      status: 'success',
      data: {
        validationStatus: 'INVALID',
        originalAddress: address,
        suggestions: validatedAddress.suggestions,
        message: 'Address could not be verified. Please check suggestions.'
      }
    });
  }

  const enrichedLocationData = {
    ...locationData,
    formattedAddress: validatedAddress.formattedAddress,
    placeId: validatedAddress.placeId,
    components: validatedAddress.components
  };

  const user = await locationDetectionService.updateUserLocation(req.user.id, enrichedLocationData, 'manual');
  res.status(200).json({
    status: 'success',
    data: {
      location: enrichedLocationData,
      source: 'manual',
      timestamp: new Date(),
      lastUpdate: user.location_updated_at
    }
  });
});

// Retrieve Current User Location
exports.getCurrentLocation = catchAsync(async (req, res) => {
  logger.info('Fetching current location', { userId: req.user.id });

  const locationInfo = await locationDetectionService.getUserLocation(req.user.id);
  const enhancedLocationInfo = {
    ...locationInfo,
    accuracy: locationInfo.source === 'gps' ? 'high' : locationInfo.source === 'manual' ? 'high' : 'low',
    lastUpdateAge: new Date() - new Date(locationInfo.lastUpdated),
    needsRefresh: (new Date() - new Date(locationInfo.lastUpdated)) > (12 * 60 * 60 * 1000) // 12 hours
  };

  res.status(200).json({
    status: 'success',
    data: enhancedLocationInfo
  });
});

// GPS Location Update with Reverse Geocoding (Geolocation1Service)
exports.updateGPSLocation = catchAsync(async (req, res) => {
  const { latitude, longitude, accuracy, speed, heading } = req.body;
  logger.info('Updating GPS location', { userId: req.user.id, coordinates: { latitude, longitude } });

  const locationData = { latitude, longitude, accuracy, speed, heading, source: 'gps', timestamp: new Date() };
  const addressInfo = await geolocation1Service.reverseGeocode(latitude, longitude);

  const enrichedLocationData = {
    ...locationData,
    formattedAddress: addressInfo.formattedAddress,
    placeId: addressInfo.placeId,
    components: addressInfo.components,
    countryCode: addressInfo.components.country // Assuming country is in components
  };

  const user = await locationDetectionService.updateUserLocation(req.user.id, enrichedLocationData, 'gps');
  res.status(200).json({
    status: 'success',
    data: {
      location: enrichedLocationData,
      accuracy: accuracy || 'unknown',
      timestamp: new Date(),
      lastUpdate: user.location_updated_at
    }
  });
});

// Route Calculation (Geolocation2Service)
exports.calculateRoute = catchAsync(async (req, res) => {
  const { origin, destination, waypoints } = req.body;
  logger.info('Calculating route', { userId: req.user.id, origin, destination });

  const route = await geolocation2Service.calculateRouteForDriver(origin, destination, waypoints);
  res.status(200).json({
    status: 'success',
    data: {
      route,
      timestamp: new Date()
    }
  });
});

// Optimize Delivery Route (Geolocation2Service)
exports.optimizeDeliveryRoute = catchAsync(async (req, res) => {
  const { driverLocation, deliveries } = req.body;
  logger.info('Optimizing delivery route', { userId: req.user.id, deliveryCount: deliveries.length });

  const optimizedRoute = await geolocation2Service.optimizeMultipleDeliveries(driverLocation, deliveries);
  res.status(200).json({
    status: 'success',
    data: {
      optimizedRoute,
      timestamp: new Date()
    }
  });
});

// Calculate Delivery Time Windows (Geolocation2Service)
exports.calculateDeliveryTimeWindows = catchAsync(async (req, res) => {
  const { origin, destinations } = req.body;
  logger.info('Calculating delivery time windows', { userId: req.user.id, destinationCount: destinations.length });

  const timeWindows = await geolocation2Service.calculateDeliveryTimeWindows(origin, destinations);
  res.status(200).json({
    status: 'success',
    data: {
      timeWindows,
      optimalWindow: timeWindows.optimalWindow,
      minAverageDuration: timeWindows.minAverageDuration,
      timestamp: new Date()
    }
  });
});

// Create Geofence (Geolocation3Service)
exports.createGeofence = catchAsync(async (req, res) => {
  const { coordinates, name } = req.body;
  logger.info('Creating geofence', { userId: req.user.id, name });

  const geofence = await geolocation3Service.createGeofence(coordinates, name);
  res.status(201).json({
    status: 'success',
    data: {
      geofence,
      timestamp: new Date()
    }
  });
});

// Check Point in Geofence (Geolocation3Service)
exports.checkPointInGeofence = catchAsync(async (req, res) => {
  const { point, geofenceId } = req.body;
  logger.info('Checking point in geofence', { userId: req.user.id, geofenceId });

  const isInside = await geolocation3Service.isPointInDeliveryArea(point, geofenceId);
  res.status(200).json({
    status: 'success',
    data: {
      isInside,
      geofenceId,
      point,
      timestamp: new Date()
    }
  });
});

// Analyze Delivery Hotspots (Geolocation3Service)
exports.analyzeDeliveryHotspots = catchAsync(async (req, res) => {
  const { deliveryHistory, timeframe } = req.body;
  logger.info('Analyzing delivery hotspots', { userId: req.user.id, timeframe });

  const hotspots = await geolocation3Service.analyzeDeliveryHotspots(deliveryHistory, timeframe);
  res.status(200).json({
    status: 'success',
    data: {
      hotspots,
      timeframe,
      timestamp: new Date()
    }
  });
});

// Health Check for All Services
exports.checkGeolocationHealth = catchAsync(async (req, res) => {
  logger.info('Checking geolocation services health', { userId: req.user.id });

  const healthChecks = await Promise.all([
    locationDetectionService.detectLocationFromIP(req.ip).then(() => 'healthy').catch(() => 'unhealthy'),
    geolocation1Service.checkHealth(),
    geolocation2Service.checkHealth(),
    geolocation3Service.checkHealth()
  ]);

  const services = ['locationDetection', 'geolocation1', 'geolocation2', 'geolocation3'];
  const healthStatus = services.reduce((acc, service, idx) => {
    acc[service] = healthChecks[idx];
    return acc;
  }, {});

  res.status(200).json({
    status: 'success',
    data: {
      health: healthStatus,
      timestamp: new Date()
    }
  });
});

// Error Handler
exports.handleLocationError = (err, req, res, next) => {
  logger.error('Location service error:', {
    error: err.message,
    stack: err.stack,
    endpoint: req.originalUrl,
    method: req.method,
    userId: req.user?.id,
    timestamp: new Date()
  });

  if (err.name === 'LocationServiceError') {
    return res.status(503).json({
      status: 'error',
      message: 'Location service temporarily unavailable',
      retry: true
    });
  }

  if (err.name === 'LocationValidationError') {
    return res.status(400).json({
      status: 'error',
      message: err.message,
      retry: false
    });
  }

  next(err);
};