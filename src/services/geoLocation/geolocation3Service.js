const { Client } = require('@googlemaps/google-maps-services-js');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

class Geolocation3Service {
  constructor() {
    this.client = new Client({
      retry: {
        maxRetries: 3,
        maxRetryDelay: 5000,
      }
    });
  }

  /**
   * Creates a geofence.
   * @param {Object[]} coordinates - Array of coordinate objects.
   * @param {string} name - Name of the geofence.
   * @returns {Promise<Object>} - Geofence details.
   * @throws {AppError} - Throws error if geofence creation fails.
   */
  async createGeofence(coordinates, name) {
    try {
      if (!this._isValidPolygon(coordinates)) {
        throw new AppError('Invalid geofence coordinates', 400);
      }
      const geofence = {
        name,
        coordinates,
        center: this._calculatePolygonCenter(coordinates),
        area: this._calculatePolygonArea(coordinates)
      };
      return geofence;
    } catch (error) {
      logger.error('Geofence creation error:', { error: error.message, name });
      throw new AppError('Unable to create geofence', 503);
    }
  }

  /**
   * Checks if a point is within a delivery area.
   * @param {Object} point - Point coordinates.
   * @param {string} geofenceId - ID of the geofence.
   * @returns {Promise<boolean>} - True if the point is inside the geofence.
   * @throws {AppError} - Throws error if the check fails.
   */
  async isPointInDeliveryArea(point, geofenceId) {
    try {
      const geofence = await this._getGeofence(geofenceId);
      return this._isPointInPolygon(point, geofence.coordinates);
    } catch (error) {
      logger.error('Point in delivery area check error:', { error: error.message, point });
      throw new AppError('Unable to check delivery area', 503);
    }
  }

  /**
   * Analyzes delivery hotspots based on delivery history.
   * @param {Object[]} deliveryHistory - Array of delivery history objects.
   * @param {string} timeframe - Timeframe for analysis.
   * @returns {Promise<Object[]>} - Enriched clusters with hotspot data.
   * @throws {AppError} - Throws error if analysis fails.
   */
  async analyzeDeliveryHotspots(deliveryHistory, timeframe) {
    try {
      const locations = deliveryHistory.map(d => d.location);
      const clusters = this._clusterLocations(locations);

      const enrichedClusters = await Promise.all(
        clusters.map(async cluster => {
          const nearbyPlaces = await this.searchNearbyPlaces(
            cluster.center,
            'establishment',
            500
          );

          return {
            ...cluster,
            popularTimes: this._analyzeDeliveryTimes(
              deliveryHistory.filter(d =>
                this._isPointInRadius(d.location, cluster.center, 500)
              )
            ),
            nearbyPlaces
          };
        })
      );
      return enrichedClusters;
    } catch (error) {
      logger.error('Delivery hotspot analysis error:', {
        error: error.message,
        timeframe,
        deliveryCount: deliveryHistory.length
      });
      throw new AppError('Unable to analyze delivery hotspots', 503);
    }
  }

  /**
   * Health check for the geolocation service.
   * @returns {Promise<string>} - Returns 'healthy' or 'unhealthy'.
   */
  async checkHealth() {
    try {
      // Use a test geofence to check the health of the service
      const testCoordinates = [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 1 },
        { lat: 1, lng: 1 },
        { lat: 1, lng: 0 },
        { lat: 0, lng: 0 }
      ];
      await this.createGeofence(testCoordinates, 'Test Geofence');
      return 'healthy';
    } catch (error) {
      logger.error('Health check failed:', { error: error.message });
      return 'unhealthy';
    }
  }

  // Additional Geofence Operations

  async getGeofenceDetails(geofenceId) {
    return await this._getGeofence(geofenceId);
  }

  async updateGeofence(geofenceId, coordinates, name) {
    const geofence = await this._getGeofence(geofenceId);
    geofence.coordinates = coordinates;
    geofence.name = name;
    geofence.center = this._calculatePolygonCenter(coordinates);
    geofence.area = this._calculatePolygonArea(coordinates);
    return geofence;
  }

  async analyzeTimeframe(startTime, endTime, geofenceId) {
    // In a real scenario, fetch events associated with the geofence from your database.
    // Here, we simulate analysis by returning a dummy summary.
    return {
      geofenceId,
      startTime,
      endTime,
      totalEvents: 0
    };
  }

  // Missing helper implementations

  async _getGeofence(geofenceId) {
    // Simulated geofence retrieval.
    // In production, integrate with your geofence datastore (e.g., a database or cache).
    if (geofenceId === 'test') {
      return {
        name: 'Test Geofence',
        coordinates: [
          { lat: 0, lng: 0 },
          { lat: 0, lng: 1 },
          { lat: 1, lng: 1 },
          { lat: 1, lng: 0 },
          { lat: 0, lng: 0 }
        ],
        center: { lat: 0.5, lng: 0.5 },
        area: 1
      };
    }
    throw new AppError(`Geofence with ID ${geofenceId} not found`, 404);
  }

  async searchNearbyPlaces(location, type, radius) {
    try {
      const response = await this.client.placesNearby({
        params: {
          location,
          radius,
          type,
          key: process.env.GOOGLE_MAPS_API_KEY
        },
        timeout: 5000
      });
      return response.data.results;
    } catch (error) {
      logger.error('Nearby places search error:', { error: error.message, location, type, radius });
      return [];
    }
  }

  _analyzeDeliveryTimes(deliveries) {
    // A simple analysis: count total deliveries.
    return {
      totalDeliveries: deliveries.length
    };
  }

  _isPointInRadius(point, center, radius) {
    const R = 6371000; // Earth radius in meters
    const dLat = this._deg2rad(point.lat - center.lat);
    const dLng = this._deg2rad(point.lng - center.lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._deg2rad(center.lat)) * Math.cos(this._deg2rad(point.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance <= radius;
  }

  _deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Existing helper methods

  _isValidPolygon(coordinates) {
    if (coordinates.length < 4 || !this._areFirstAndLastPointsEqual(coordinates)) {
      return false;
    }
    return true;
  }

  _areFirstAndLastPointsEqual(coordinates) {
    const firstPoint = coordinates[0];
    const lastPoint = coordinates[coordinates.length - 1];
    return firstPoint.lat === lastPoint.lat && firstPoint.lng === lastPoint.lng;
  }

  _calculatePolygonCenter(coordinates) {
    let sumLat = 0;
    let sumLng = 0;
    for (const coord of coordinates) {
      sumLat += coord.lat;
      sumLng += coord.lng;
    }
    return {
      lat: sumLat / coordinates.length,
      lng: sumLng / coordinates.length
    };
  }

  _calculatePolygonArea(coordinates) {
    let area = 0;
    const n = coordinates.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += coordinates[i].lng * coordinates[j].lat;
      area -= coordinates[i].lat * coordinates[j].lng;
    }
    return Math.abs(area) / 2.0;
  }

  _isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lng, yi = polygon[i].lat;
      const xj = polygon[j].lng, yj = polygon[j].lat;
      const intersect = ((yi > point.lat) !== (yj > point.lat)) &&
                        (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  _clusterLocations(locations) {
    // A basic clustering implementation.
    // For demonstration, we return a single cluster comprising all provided locations.
    return [{
      center: this._calculatePolygonCenter(locations),
      points: locations
    }];
  }
}

module.exports = new Geolocation3Service();