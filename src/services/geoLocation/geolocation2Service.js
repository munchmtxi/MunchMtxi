const { Client } = require('@googlemaps/google-maps-services-js');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');

class Geolocation2Service {
  constructor() {
    this.client = new Client({
      retry: {
        maxRetries: 3,
        maxRetryDelay: 5000,
      }
    });
  }

  /**
   * Calculates a route for a driver.
   * @param {string} origin - The starting location.
   * @param {string} destination - The ending location.
   * @param {string[]} waypoints - Optional waypoints.
   * @returns {Promise<Object>} - Route details.
   * @throws {AppError} - Throws error if route calculation fails.
   */
  async calculateRouteForDriver(origin, destination, waypoints = []) {
    try {
      const response = await this.client.directions({
        params: {
          origin,
          destination,
          waypoints: waypoints.length ? waypoints : undefined,
          optimize: true,
          mode: 'driving',
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 5000,
      });
      if (!response.data.routes.length) {
        throw new AppError('No route found', 400);
      }
      return this._formatRouteResponse(response.data.routes[0]);
    } catch (error) {
      logger.error('Route calculation error:', { error: error.message, origin, destination });
      if (error instanceof AppError) throw error;
      throw new AppError('Route calculation service unavailable', 503);
    }
  }

  /**
   * Calculates delivery time windows for multiple destinations.
   * @param {string} origin - The starting location.
   * @param {string[]} destinations - Array of destination locations.
   * @returns {Promise<Object>} - Time window analysis.
   * @throws {AppError} - Throws error if time window calculation fails.
   */
  async calculateDeliveryTimeWindows(origin, destinations) {
    try {
      const timeWindows = [];
      const intervals = this._generateTimeIntervals();
      for (const interval of intervals) {
        const response = await this.client.distancematrix({
          params: {
            origins: [origin],
            destinations,
            departure_time: interval,
            traffic_model: 'best_guess',
            key: process.env.GOOGLE_MAPS_API_KEY,
          }
        });
        timeWindows.push({
          interval,
          estimates: this._formatTrafficEstimates(response.data)
        });
      }
      return this._analyzeTimeWindows(timeWindows);
    } catch (error) {
      logger.error('Time window calculation error:', { error: error.message, origin });
      throw new AppError('Time window calculation failed', 503);
    }
  }

  /**
   * Optimizes multiple deliveries for a driver.
   * @param {string} driverLocation - The driver's current location.
   * @param {Object[]} deliveries - Array of delivery objects.
   * @returns {Promise<Object>} - Optimized delivery route.
   * @throws {AppError} - Throws error if optimization fails.
   */
  async optimizeMultipleDeliveries(driverLocation, deliveries) {
    try {
      const prioritizedDeliveries = this._prioritizeDeliveries(deliveries);

      const response = await this.client.directions({
        params: {
          origin: driverLocation,
          destination: driverLocation,
          waypoints: prioritizedDeliveries.map(d => d.location),
          optimize: true,
          departure_time: 'now',
          traffic_model: 'best_guess',
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });
      return this._formatOptimizedDeliveryRoute(
        response.data.routes[0],
        prioritizedDeliveries
      );
    } catch (error) {
      logger.error('Multiple deliveries optimization error:', {
        error: error.message,
        driverLocation,
        deliveryCount: deliveries.length
      });
      throw new AppError('Unable to optimize deliveries', 503);
    }
  }

  /**
   * Health check for the geolocation service.
   * @returns {Promise<string>} - Returns 'healthy' or 'unhealthy'.
   */
  async checkHealth() {
    try {
      // Use a test origin and destination to check the health of the service
      await this.calculateRouteForDriver('New York, NY', 'Los Angeles, CA');
      return 'healthy';
    } catch (error) {
      logger.error('Health check failed:', { error: error.message });
      return 'unhealthy';
    }
  }

  // Helper methods

  _formatRouteResponse(route) {
    return {
      distance: {
        text: route.legs[0].distance.text,
        value: route.legs[0].distance.value
      },
      duration: {
        text: route.legs[0].duration.text,
        value: route.legs[0].duration.value
      },
      polyline: route.overview_polyline.points,
      steps: route.legs[0].steps.map(step => ({
        instruction: step.html_instructions,
        distance: step.distance,
        duration: step.duration,
        location: step.start_location
      }))
    };
  }

  _generateTimeIntervals() {
    const intervals = [];
    const now = new Date();
    for (let i = 0; i < 24; i++) {
      intervals.push(new Date(now.getTime() + i * 3600000));
    }
    return intervals;
  }

  _formatTrafficEstimates(data) {
    if (!data.rows[0]?.elements[0]) {
      throw new AppError('Invalid traffic estimate response', 500);
    }
    return data.rows[0].elements.map(element => ({
      duration: element.duration,
      durationInTraffic: element.duration_in_traffic,
      distance: element.distance
    }));
  }

  _analyzeTimeWindows(timeWindows) {
    let optimalWindow = null;
    let minAverageDuration = Infinity;
    for (const window of timeWindows) {
      const estimates = window.estimates;
      let totalDuration = 0;
      let count = 0;
      for (const estimate of estimates) {
        if (estimate.durationInTraffic && estimate.durationInTraffic.value) {
          totalDuration += estimate.durationInTraffic.value;
          count++;
        }
      }
      if (count > 0) {
        const averageDuration = totalDuration / count;
        if (averageDuration < minAverageDuration) {
          minAverageDuration = averageDuration;
          optimalWindow = window.interval;
        }
      }
    }
    return { optimalWindow, minAverageDuration };
  }

  _prioritizeDeliveries(deliveries) {
    return deliveries.sort((a, b) => {
      const priorityScore = (delivery) => {
        let score = 0;
        if (delivery.timeWindow) score += this._calculateTimeUrgency(delivery);
        if (delivery.customerTier === 'premium') score += 10;
        score += delivery.value / 100;
        return score;
      };
      return priorityScore(b) - priorityScore(a);
    });
  }

  _formatOptimizedDeliveryRoute(route, prioritizedDeliveries) {
    const optimizedOrder = prioritizedDeliveries.map((delivery, index) => ({
      deliveryId: delivery.id,
      location: delivery.location,
      estimatedDuration: route.legs[index + 1] ? route.legs[index + 1].duration.value : null,
      estimatedDistance: route.legs[index + 1] ? route.legs[index + 1].distance.value : null
    }));
    const totalDistance = route.legs.reduce((sum, leg) => sum + (leg.distance ? leg.distance.value : 0), 0);
    const totalDuration = route.legs.reduce((sum, leg) => sum + (leg.duration ? leg.duration.value : 0), 0);
    return {
      totalDistance,
      totalDuration,
      optimizedOrder,
      polyline: route.overview_polyline.points
    };
  }

  _calculateTimeUrgency(delivery) {
    if (!delivery.timeWindow) return 0;
    const now = Date.now();
    const deadline = new Date(delivery.timeWindow).getTime();
    const minutesLeft = (deadline - now) / 60000;
    return minutesLeft < 0 ? Math.abs(minutesLeft) + 60 : Math.max(0, 60 - minutesLeft);
  }
}

module.exports = new Geolocation2Service();