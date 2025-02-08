const { Client } = require('@googlemaps/google-maps-services-js');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const countries = require('@config/countryConfigs');

class Geolocation1Service {
  constructor() {
    // Initialize with retry logic for resilience
    this.client = new Client({
      retry: {
        maxRetries: 3,
        maxRetryDelay: 5000,
      }
    });
  }

  /**
   * Validates an address using Google Maps API.
   * @param {string} address - The address to validate.
   * @param {string} countryCode - The country code (ISO Alpha-3).
   * @returns {Promise<Object>} - Formatted address details.
   * @throws {AppError} - Throws error if validation fails.
   */
  async validateAddress(address, countryCode) {
    try {
      const countryConfig = countries[countryCode];
      if (!countryConfig) {
        throw new AppError('Unsupported country code', 400);
      }
      const response = await this.client.geocode({
        params: {
          address,
          region: countryCode,
          components: `country:${countryCode}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 5000,
      });
      if (response.data.results.length === 0) {
        throw new AppError('Invalid address', 400);
      }
      return this._formatAddressResponse(response.data.results[0], countryConfig);
    } catch (error) {
      logger.error('Address validation error:', { error: error.message, address, countryCode });
      if (error instanceof AppError) throw error;
      throw new AppError('Address validation service unavailable', 503);
    }
  }

  /**
   * Validates multiple addresses.
   * @param {string[]} addresses - Array of addresses to validate.
   * @param {string} countryCode - Country code (ISO Alpha-3).
   * @returns {Promise<Object[]>} - Array of validation results.
   */
  async validateMultipleAddresses(addresses, countryCode) {
    const results = [];
    for (const address of addresses) {
      try {
        const result = await this.validateAddress(address, countryCode);
        results.push({ address, result, success: true });
      } catch (error) {
        results.push({ address, error: error.message, success: false });
      }
    }
    return results;
  }

  /**
   * Performs reverse geocoding to retrieve address from coordinates.
   * @param {number} latitude - Latitude coordinate.
   * @param {number} longitude - Longitude coordinate.
   * @returns {Promise<Object>} - Reverse geocoded address details.
   * @throws {AppError} - Throws error if lookup fails.
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const response = await this.client.reverseGeocode({
        params: {
          latlng: { lat: latitude, lng: longitude },
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 5000,
      });
      if (!response.data.results.length) {
        throw new AppError('No address found for these coordinates', 400);
      }
      return this._formatAddressResponse(response.data.results[0]);
    } catch (error) {
      logger.error('Reverse geocoding error:', { error: error.message, latitude, longitude });
      throw new AppError('Reverse geocoding service unavailable', 503);
    }
  }

  /**
   * Health check for the geolocation service.
   * @returns {Promise<string>} - Returns 'healthy' or 'unhealthy'.
   */
  async checkHealth() {
    try {
      // Use a test address and country code to check the health of the service
      await this.validateAddress('test', 'MWI');
      return 'healthy';
    } catch (error) {
      logger.error('Health check failed:', { error: error.message });
      return 'unhealthy';
    }
  }

  /**
   * Formats Google Maps API response into a structured format.
   * @param {Object} googleResult - Google API response.
   * @param {Object} countryConfig - Country-specific address format.
   * @returns {Object} - Structured address response.
   * @private
   */
  _formatAddressResponse(googleResult, countryConfig) {
    const components = {};
    googleResult.address_components.forEach(component => {
      component.types.forEach(type => {
        if (countryConfig?.addressFormat.required.includes(type) ||
            countryConfig?.addressFormat.optional.includes(type)) {
          components[type] = component.long_name;
        }
      });
    });
    return {
      formattedAddress: googleResult.formatted_address,
      components,
      location: googleResult.geometry.location,
      placeId: googleResult.place_id,
    };
  }
}

module.exports = new Geolocation1Service();