// src/services/merchant/profile/mapsService.js
const axios = require('axios');
const config = require('@config/config');
const { Merchant } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const mapsService = {
  baseUrl: 'https://maps.googleapis.com/maps/api/place',

  async getPlacePredictions(input, sessionToken) {
    try {
      const response = await axios.get(`${this.baseUrl}/autocomplete/json`, {
        params: {
          input,
          key: config.googleMaps.apiKey,
          sessiontoken: sessionToken,
          types: 'address',
        },
      });

      if (response.data.status !== 'OK') {
        logger.error('Google Places API Error', { status: response.data.status });
        throw new AppError('Failed to fetch address suggestions', 422, 'MAPS_API_ERROR');
      }

      logger.info('Fetched place predictions', { input, count: response.data.predictions.length });
      return response.data.predictions.map((prediction) => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting.main_text,
        secondaryText: prediction.structured_formatting.secondary_text,
      }));
    } catch (error) {
      logger.error('Maps Service Error in getPlacePredictions', {
        message: error.message,
        stack: error.stack,
      });
      throw error instanceof AppError ? error : new AppError('Maps service unavailable', 500, 'MAPS_SERVICE_FAILURE');
    }
  },

  async getPlaceDetails(placeId, sessionToken) {
    try {
      const params = {
        place_id: placeId, // Revert to standard param
        key: config.googleMaps.apiKey,
        sessiontoken: sessionToken,
        fields: 'formatted_address,geometry',
      };
      const url = `${this.baseUrl}/details/json?${new URLSearchParams(params).toString()}`;
      logger.info('Constructed Place Details URL', { url });
  
      const response = await axios.get(url);
  
      logger.info('Raw Place Details response', { data: response.data });
      if (response.data.status !== 'OK') {
        logger.error('Google Place Details API Error', { status: response.data.status });
        throw new AppError('Failed to fetch address details', 422, 'MAPS_API_ERROR');
      }
  
      const { result } = response.data;
      logger.info('Fetched place details', { placeId });
      return {
        formattedAddress: result.formatted_address,
        location: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
        },
      };
    } catch (error) {
      logger.error('Maps Service Error in getPlaceDetails', { message: error.message, stack: error.stack });
      throw error instanceof AppError ? error : new AppError('Maps service unavailable', 500, 'MAPS_SERVICE_FAILURE');
    }
  },

  async updateMerchantAddress(merchantId, addressData) {
    try {
      const merchant = await Merchant.findByPk(merchantId);
      if (!merchant) {
        logger.warn('Merchant not found for address update', { merchantId });
        throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
      }

      await merchant.update({
        place_id: addressData.placeId,
        formatted_address: addressData.formattedAddress,
        latitude: addressData.location.lat,
        longitude: addressData.location.lng,
      });

      logger.info('Merchant address updated', { merchantId, formattedAddress: addressData.formattedAddress });
      return merchant;
    } catch (error) {
      logger.error('Update merchant address error', {
        merchantId,
        message: error.message,
        stack: error.stack,
      });
      throw error instanceof AppError ? error : new AppError('Failed to update address', 500, 'ADDRESS_UPDATE_FAILURE');
    }
  },
};

module.exports = mapsService;