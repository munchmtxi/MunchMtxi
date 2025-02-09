const catchAsync = require('@utils/catchAsync');
const geolocation1Service = require('@services/geoLocation/geolocation1Service');
const geolocation2Service = require('@services/geoLocation/geolocation2Service');
const geolocation3Service = require('@services/geoLocation/geolocation3Service');
const locationDetectionService = require('@services/geoLocation/locationDetectionService');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

// Location Detection Controllers
exports.detectCurrentLocation = catchAsync(async (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  
  // Log location detection attempt
  logger.info('Location detection attempt', { 
    userId: req.user.id, 
    ip: ip 
  });

  const locationData = await locationDetectionService.detectLocationFromIP(ip);
  
  // Check if location is in supported country
  if (!locationData.countryCode) {
    throw new AppError('Location detection failed - country not supported', 400);
  }

  // Update user's detected location with enhanced data
  const updatedUser = await locationDetectionService.updateUserLocation(
    req.user.id, 
    locationData,
    'ip'
  );

  // Enhanced response with more details
  res.status(200).json({
    status: 'success',
    data: {
      location: locationData,
      source: 'ip',
      timestamp: new Date(),
      accuracy: locationData.accuracy || 'low', // IP geolocation typically has low accuracy
      lastUpdate: updatedUser.location_updated_at
    }
  });
});

exports.setManualLocation = catchAsync(async (req, res) => {
  const { latitude, longitude, address, countryCode } = req.body;
  
  // Log manual location update attempt
  logger.info('Manual location update attempt', {
    userId: req.user.id,
    coordinates: { latitude, longitude }
  });

  // Validate country support
  const locationData = {
    latitude,
    longitude,
    address,
    countryCode,
    setAt: new Date(),
    source: 'manual',
    accuracy: 'high' // Manual entry assumed to be high accuracy
  };

  // Additional validation using geolocation1Service
  const validatedAddress = await geolocation1Service.validateAddress(
    address,
    countryCode.toUpperCase()
  );

  // Combine validated data
  const enrichedLocationData = {
    ...locationData,
    formattedAddress: validatedAddress.formattedAddress,
    placeId: validatedAddress.placeId,
    components: validatedAddress.components
  };

  const user = await locationDetectionService.updateUserLocation(
    req.user.id, 
    enrichedLocationData, 
    'manual'
  );

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

exports.getCurrentLocation = catchAsync(async (req, res) => {
  // Log location request
  logger.info('Location request', { userId: req.user.id });

  const locationInfo = await locationDetectionService.getUserLocation(req.user.id);
  
  // Enhance with additional context
  const enhancedLocationInfo = {
    ...locationInfo,
    accuracy: locationInfo.source === 'gps' ? 'high' : 
              locationInfo.source === 'manual' ? 'high' : 'low',
    lastUpdateAge: new Date() - new Date(locationInfo.lastUpdated),
    needsRefresh: (new Date() - new Date(locationInfo.lastUpdated)) > (12 * 60 * 60 * 1000) // 12 hours
  };

  res.status(200).json({
    status: 'success',
    data: enhancedLocationInfo
  });
});

exports.updateGPSLocation = catchAsync(async (req, res) => {
  const { latitude, longitude, accuracy, speed, heading } = req.body;
  
  // Log GPS update attempt
  logger.info('GPS location update attempt', {
    userId: req.user.id,
    coordinates: { latitude, longitude }
  });

  // Validate and format GPS data with enhanced fields
  const locationData = await locationDetectionService.validateAndFormatGPSLocation({
    latitude,
    longitude,
    accuracy,
    speed,
    heading,
    source: 'gps',
    timestamp: new Date(),
    deviceInfo: req.headers['user-agent']
  });

  // Reverse geocode the coordinates for additional context
  const addressInfo = await geolocation1Service.reverseGeocode(latitude, longitude);

  // Combine GPS and address data
  const enrichedLocationData = {
    ...locationData,
    address: addressInfo.formattedAddress,
    placeId: addressInfo.placeId,
    components: addressInfo.components
  };

  // Update user location with enriched data
  const user = await locationDetectionService.updateUserLocation(
    req.user.id, 
    enrichedLocationData, 
    'gps'
  );

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

// Keep all other existing controller methods...
// (validateAddress, validateMultipleAddresses, reverseGeocode, etc.)

// Enhanced error handler for location-specific errors
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

  exports.verifyAndSuggestAddress = catchAsync(async (req, res) => {
    const { address, countryCode } = req.body;
    
    // Validate and format the address
    const validationResult = await geolocation1Service.validateAddress(
      address,
      countryCode
    );
  
    // If address is valid, save it to the database
    if (validationResult.status === 'VALID') {
      const addressRecord = await Address.create({
        formattedAddress: validationResult.formattedAddress,
        placeId: validationResult.placeId,
        latitude: validationResult.location.lat,
        longitude: validationResult.location.lng,
        components: validationResult.components,
        countryCode,
        validationStatus: 'VALID',
        validatedAt: new Date(),
        nearbyValidAddresses: validationResult.suggestions
      });
  
      res.status(200).json({
        status: 'success',
        data: {
          address: addressRecord,
          confidence: validationResult.confidence,
          suggestions: validationResult.suggestions
        }
      });
    } else {
      // If address is invalid, return suggestions
      res.status(200).json({
        status: 'success',
        data: {
          validationStatus: 'INVALID',
          originalAddress: address,
          suggestions: validationResult.suggestions,
          message: 'Address could not be verified. Please check suggestions.'
        }
      });
    }
  });

  next(err);
};