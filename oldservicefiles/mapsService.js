// @services/merchantServices/profileServices/mapsService.js
const axios = require('axios');
const AppError = require('@utils/AppError');
const logger = require('@utils/logger');
const { Merchant } = require('@models');

const mapsService = {
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  baseUrl: 'https://maps.googleapis.com/maps/api/place',

  async getPlacePredictions(input, sessionToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/autocomplete/json`, {
        params: {
          input,
          key: this.apiKey,
          sessiontoken: sessionToken,
          types: 'address'
        }
      });

      if (response.data.status !== 'OK') {
        logger.error('Google Places API Error:', response.data.status);
        throw new AppError('Failed to fetch address suggestions', 422);
      }

      return response.data.predictions.map(prediction => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting.main_text,
        secondaryText: prediction.structured_formatting.secondary_text
      }));
    } catch (error) {
      logger.error('Maps Service Error:', error);
      throw new AppError(error.message, error.status || 500);
    }
  },

  async getPlaceDetails(placeId, sessionToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/details/json`, {
        params: {
          place_id: placeId,
          key: this.apiKey,
          sessiontoken: sessionToken,
          fields: 'formatted_address,geometry'
        }
      });

      if (response.data.status !== 'OK') {
        logger.error('Google Place Details API Error:', response.data.status);
        throw new AppError('Failed to fetch address details', 422);
      }

      const { result } = response.data;
      return {
        formattedAddress: result.formatted_address,
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        }
      };
    } catch (error) {
      logger.error('Maps Service Error:', error);
      throw new AppError(error.message, error.status || 500);
    }
  },

  async updateMerchantAddress(merchantId, addressData) {
    try {
      const merchant = await Merchant.findByPk(merchantId);
      
      if (!merchant) {
        throw new AppError('Merchant not found', 404);
      }

      await merchant.update({
        place_id: addressData.placeId,
        formatted_address: addressData.formattedAddress,
        latitude: addressData.location.lat,
        longitude: addressData.location.lng
      });

      return merchant;
    } catch (error) {
      logger.error('Update merchant address error:', error);
      throw new AppError(error.message, error.status || 500);
    }
  }
};

module.exports = mapsService;