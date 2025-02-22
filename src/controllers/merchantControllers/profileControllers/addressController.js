// @controllers/merchantControllers/profileControllers/addressController.js
const catchAsync = require('@utils/catchAsync');  // Changed from destructuring
const mapsService = require('@services/merchantServices/profileServices/mapsService');
const { v4: uuidv4 } = require('uuid');

exports.getAddressSuggestions = catchAsync(async (req, res) => {
  const { input } = req.query;
  
  // Generate or retrieve session token from request
  const sessionToken = req.session.mapsToken || uuidv4();
  req.session.mapsToken = sessionToken;

  const predictions = await mapsService.getPlacePredictions(input, sessionToken);
  
  res.status(200).json({
    status: 'success',
    data: predictions
  });
});

exports.getAddressDetails = catchAsync(async (req, res) => {
  const { placeId } = req.params;
  const sessionToken = req.session.mapsToken;

  const details = await mapsService.getPlaceDetails(placeId, sessionToken);
  
  // Clear session token after getting details
  delete req.session.mapsToken;
  
  res.status(200).json({
    status: 'success',
    data: details
  });
});

exports.updateMerchantAddress = catchAsync(async (req, res) => {
  const { placeId, formattedAddress, location } = req.body;
  
  if (!placeId || !formattedAddress || !location) {
    throw new AppError('Missing required address information', 400);
  }

  // Verify the place details
  const placeDetails = await mapsService.getPlaceDetails(placeId);

  // Update merchant's address in database
  const updatedMerchant = await mapsService.updateMerchantAddress(
    req.params.merchantId,
    {
      placeId,
      formattedAddress: placeDetails.formattedAddress,
      location: placeDetails.location
    }
  );

  res.status(200).json({
    status: 'success',
    data: {
      merchant: updatedMerchant
    }
  });
});