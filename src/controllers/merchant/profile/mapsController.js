// src/controllers/merchant/profile/mapsController.js
const mapsService = require('@services/merchant/profile/mapsService');
const catchAsync = require('@utils/catchAsync');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

const mapsController = {
  /**
   * Get address predictions based on user input.
   * @route GET /api/merchant/profile/maps/predictions
   * @param {string} req.query.input - The address input to search for.
   * @param {string} req.query.sessionToken - Session token for Google Maps API.
   */
  getPlacePredictions: catchAsync(async (req, res, next) => {
    const { input, sessionToken } = req.query;

    if (!input || !sessionToken) {
      throw new AppError('Input and sessionToken are required', 400, 'INVALID_REQUEST');
    }

    const predictions = await mapsService.getPlacePredictions(input, sessionToken);

    logger.info('Place predictions retrieved', {
      merchantId: req.user?.merchantId,
      input,
      predictionCount: predictions.length,
    });

    res.status(200).json({
      status: 'success',
      results: predictions.length,
      data: { predictions },
    });
  }),

  /**
   * Get detailed address information for a specific place ID.
   * @route GET /api/merchant/profile/maps/details
   * @param {string} req.query.placeId - The Google Maps Place ID.
   * @param {string} req.query.sessionToken - Session token for Google Maps API.
   */
  getPlaceDetails: catchAsync(async (req, res, next) => {
    const { placeId, sessionToken } = req.query;

    if (!placeId || !sessionToken) {
      throw new AppError('placeId and sessionToken are required', 400, 'INVALID_REQUEST');
    }

    const details = await mapsService.getPlaceDetails(placeId, sessionToken);

    logger.info('Place details retrieved', {
      merchantId: req.user?.merchantId,
      placeId,
    });

    res.status(200).json({
      status: 'success',
      data: { details },
    });
  }),

  /**
   * Update the merchant's address with data from Google Maps.
   * @route PATCH /api/merchant/profile/maps/update-address
   * @param {string} req.body.placeId - The Google Maps Place ID.
   * @param {string} req.body.formattedAddress - The formatted address.
   * @param {object} req.body.location - Location object with lat and lng.
   */
  updateMerchantAddress: catchAsync(async (req, res, next) => {
    const { placeId, formattedAddress, location } = req.body;

    if (!placeId || !formattedAddress || !location || !location.lat || !location.lng) {
      throw new AppError('placeId, formattedAddress, and location (lat, lng) are required', 400, 'INVALID_REQUEST');
    }

    const merchantId = req.user?.merchantId;
    if (!merchantId) {
      throw new AppError('Merchant ID not found in request', 401, 'AUTH_ERROR');
    }

    const addressData = { placeId, formattedAddress, location };
    const updatedMerchant = await mapsService.updateMerchantAddress(merchantId, addressData);

    logger.info('Merchant address updated successfully', {
      merchantId,
      placeId,
      formattedAddress,
    });

    res.status(200).json({
      status: 'success',
      data: {
        merchant: {
          id: updatedMerchant.id,
          place_id: updatedMerchant.place_id,
          formatted_address: updatedMerchant.formatted_address,
          latitude: updatedMerchant.latitude,
          longitude: updatedMerchant.longitude,
        },
      },
    });
  }),
};

module.exports = mapsController;