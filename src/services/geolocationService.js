// src/services/geolocationService.js
const geolocation1Service = require('./geoLocation/geolocation1Service');
const geolocation2Service = require('./geoLocation/geolocation2Service');
const geolocation3Service = require('./geoLocation/geolocation3Service');
const locationDetectionService = require('./geoLocation/locationDetectionService');
const logger = require('@utils/logger');
const AppError = require('@utils/AppError');

class GeolocationService {
  constructor() {
    this.addressService = geolocation1Service;
    this.routingService = geolocation2Service;
    this.geofencingService = geolocation3Service;
    this.detectionService = locationDetectionService;
  }

  // =============================================
  // Location Detection Methods
  // =============================================
  
  async detectLocationFromIP(ip) {
    try {
      return await this.detectionService.detectLocationFromIP(ip);
    } catch (error) {
      logger.error('Location detection failed:', error);
      throw new AppError('Location detection failed', 503);
    }
  }

  async updateUserLocation(userId, locationData, source) {
    try {
      return await this.detectionService.updateUserLocation(userId, locationData, source);
    } catch (error) {
      logger.error('User location update failed:', error);
      throw new AppError('Failed to update user location', 500);
    }
  }

  async getUserLocation(userId) {
    try {
      return await this.detectionService.getUserLocation(userId);
    } catch (error) {
      logger.error('Get user location failed:', error);
      throw new AppError('Failed to get user location', 500);
    }
  }

  // =============================================
  // Address Validation Methods
  // =============================================

  async validateAddress(address, countryCode) {
    try {
      return await this.addressService.validateAddress(address, countryCode);
    } catch (error) {
      logger.error('Address validation failed:', error);
      throw new AppError('Address validation failed', 503);
    }
  }

  async validateMultipleAddresses(addresses, countryCode) {
    try {
      return await this.addressService.validateMultipleAddresses(addresses, countryCode);
    } catch (error) {
      logger.error('Multiple address validation failed:', error);
      throw new AppError('Multiple address validation failed', 503);
    }
  }

  async reverseGeocode(latitude, longitude) {
    try {
      return await this.addressService.reverseGeocode(latitude, longitude);
    } catch (error) {
      logger.error('Reverse geocoding failed:', error);
      throw new AppError('Reverse geocoding failed', 503);
    }
  }

  // =============================================
  // Route Calculation Methods
  // =============================================

  async calculateRouteForDriver(origin, destination, waypoints = []) {
    try {
      return await this.routingService.calculateRouteForDriver(origin, destination, waypoints);
    } catch (error) {
      logger.error('Route calculation failed:', error);
      throw new AppError('Route calculation failed', 503);
    }
  }

  async calculateDeliveryTimeWindows(origin, destinations) {
    try {
      return await this.routingService.calculateDeliveryTimeWindows(origin, destinations);
    } catch (error) {
      logger.error('Delivery time windows calculation failed:', error);
      throw new AppError('Failed to calculate delivery time windows', 503);
    }
  }

  async optimizeMultipleDeliveries(driverLocation, deliveries) {
    try {
      return await this.routingService.optimizeMultipleDeliveries(driverLocation, deliveries);
    } catch (error) {
      logger.error('Multiple deliveries optimization failed:', error);
      throw new AppError('Failed to optimize deliveries', 503);
    }
  }

  // =============================================
  // Geofencing Methods
  // =============================================

  async createGeofence(coordinates, name) {
    try {
      return await this.geofencingService.createGeofence(coordinates, name);
    } catch (error) {
      logger.error('Geofence creation failed:', error);
      throw new AppError('Failed to create geofence', 503);
    }
  }

  async isPointInDeliveryArea(point, geofenceId) {
    try {
      return await this.geofencingService.isPointInDeliveryArea(point, geofenceId);
    } catch (error) {
      logger.error('Delivery area check failed:', error);
      throw new AppError('Failed to check delivery area', 503);
    }
  }

  async analyzeDeliveryHotspots(deliveryHistory, timeframe) {
    try {
      return await this.geofencingService.analyzeDeliveryHotspots(deliveryHistory, timeframe);
    } catch (error) {
      logger.error('Delivery hotspot analysis failed:', error);
      throw new AppError('Failed to analyze delivery hotspots', 503);
    }
  }

  // =============================================
  // Health Check Methods
  // =============================================

  async checkHealth() {
    const status = {
      addressService: await this.addressService.checkHealth(),
      routingService: await this.routingService.checkHealth(),
      geofencingService: await this.geofencingService.checkHealth(),
      timestamp: new Date()
    };

    const isHealthy = Object.values(status).every(
      s => s === 'healthy' || s instanceof Date
    );

    logger.info('Geolocation services health check:', status);

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      details: status
    };
  }

  // =============================================
  // Utility Methods
  // =============================================

  validateCountryBounds(latitude, longitude, countryCode) {
    return this.detectionService.validateCountryBounds(latitude, longitude, countryCode);
  }
}

module.exports = new GeolocationService();