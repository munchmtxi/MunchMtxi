const { Client } = require('@googlemaps/google-maps-services-js');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const countries = require('@config/countryConfigs');
const config = require('@config/config');

class Geolocation1Service {
  constructor() {
    this.client = new Client({
      retry: {
        maxRetries: 3,
        maxRetryDelay: 5000,
      }
    });
  }

  async validateAddress(address, countryCode) {
    try {
      const countryConfig = countries[countryCode];
      if (!countryConfig) {
        throw new AppError('Unsupported country code', 400);
      }
  
      // Log the Google Maps API Key
      logger.info('Google Maps API Key', { key: process.env.GOOGLE_MAPS_API_KEY });
  
      const response = await this.client.geocode({
        params: {
          address,
          region: countryCode,
          components: `country:${countryCode}`,
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 5000,
      });
  
      logger.info('Google Maps response', { response: response.data });
  
      // Check if no exact match was found and perform fuzzy matching
      if (response.data.results.length === 0) {
        logger.warn('No exact match found for address', { address, countryCode, status: response.data.status });
        const fuzzyResponse = await this.client.geocode({
          params: {
            address: this._extractMainComponents(address),
            region: countryCode,
            components: `country:${countryCode}`,
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
        });
  
        return {
          validationStatus: { status: 'INVALID' },
          originalAddress: address,
          suggestions: fuzzyResponse.data.results.slice(0, 5).map(result => 
            this._formatAddressResponse(result, countryConfig)
          ),
          message: 'Address not found. Consider the suggested alternatives.',
        };
      }
  
      const mainResult = response.data.results[0];
      const validationStatus = this._determineValidationStatus(mainResult);
      const formattedResponse = this._formatAddressResponse(mainResult, countryConfig);
  
      let suggestions = [];
      if (validationStatus.confidence !== 'HIGH') {
        suggestions = await this._getNearbyAddresses(mainResult.geometry.location, countryCode);
      }
  
      return {
        ...formattedResponse,
        validationStatus,
        suggestions: suggestions.slice(0, 5),
      };
    } catch (error) {
      logger.error('Address validation error', { error: error.message, address, countryCode });
      if (error instanceof AppError) throw error;
      throw new AppError('Address validation service unavailable', 503);
    }
  }

  /**
   * Validates multiple addresses with enhanced verification.
   * @param {string[]} addresses - Array of addresses to validate.
   * @param {string} countryCode - Country code (ISO Alpha-3).
   * @returns {Promise<Object[]>} - Array of validation results with suggestions.
   */
  async validateMultipleAddresses(addresses, countryCode) {
    const results = [];
    for (const address of addresses) {
      try {
        const result = await this.validateAddress(address, countryCode);
        results.push({ 
          address, 
          result, 
          success: result.validationStatus.status === 'VALID' 
        });
      } catch (error) {
        results.push({ 
          address, 
          error: error.message, 
          success: false 
        });
      }
    }
    return results;
  }

  /**
   * Enhanced reverse geocoding with accuracy assessment.
   * @param {number} latitude - Latitude coordinate.
   * @param {number} longitude - Longitude coordinate.
   * @returns {Promise<Object>} - Reverse geocoded address details with accuracy.
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

      const mainResult = response.data.results[0];
      const validationStatus = this._determineValidationStatus(mainResult);
      const formattedResponse = this._formatAddressResponse(mainResult);

      return {
        ...formattedResponse,
        validationStatus,
        alternatives: response.data.results.slice(1, 4).map(result => 
          this._formatAddressResponse(result)
        )
      };
    } catch (error) {
      logger.error('Reverse geocoding error:', { error: error.message, latitude, longitude });
      throw new AppError('Reverse geocoding service unavailable', 503);
    }
  }

  async checkHealth() {
    try {
      await this.validateAddress('test', 'MWI');
      return 'healthy';
    } catch (error) {
      logger.error('Health check failed:', { error: error.message });
      return 'unhealthy';
    }
  }

  /**
   * Formats Google Maps API response into a structured format.
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
      locationType: googleResult.geometry.location_type,
      partialMatch: googleResult.partial_match || false
    };
  }

  /**
   * Determines the validation status and confidence level of an address.
   * @private
   */
  _determineValidationStatus(googleResult) {
    const locationType = googleResult.geometry.location_type;
    const isPartialMatch = googleResult.partial_match || false;

    if (locationType === 'ROOFTOP' && !isPartialMatch) {
      return { status: 'VALID', confidence: 'HIGH' };
    } else if (locationType === 'RANGE_INTERPOLATED' || locationType === 'GEOMETRIC_CENTER') {
      return { status: 'VALID', confidence: 'MEDIUM' };
    } else {
      return { status: 'VALID', confidence: 'LOW' };
    }
  }

  /**
   * Gets nearby valid addresses for suggestions.
   * @private
   */
  async _getNearbyAddresses(location, countryCode) {
    try {
      const response = await this.client.placesNearby({
        params: {
          location,
          radius: 1000,
          type: 'street_address',
          key: process.env.GOOGLE_MAPS_API_KEY
        }
      });
      
      return response.data.results.map(place => ({
        formattedAddress: place.formatted_address,
        placeId: place.place_id,
        location: place.geometry.location,
        distance: place.distance
      }));
    } catch (error) {
      logger.error('Nearby places error:', error);
      return [];
    }
  }

  /**
   * Extracts main components from an address for fuzzy matching.
   * @private
   */
  _extractMainComponents(address) {
    // Remove apartment numbers, unit numbers, etc.
    return address.replace(/(?:\s+)?(?:apt|unit|suite|floor|#)\s*[\w-]+/gi, '')
                 .replace(/\s+/g, ' ')
                 .trim();
  }
}

module.exports = new Geolocation1Service();
