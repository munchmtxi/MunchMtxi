// src/routes/merchant/profile/mapsRoutes.js
const express = require('express');
const router = express.Router();
const mapsController = require('@controllers/merchant/profile/mapsController');
const {
  authenticateMerchant,
  hasAddressPermission,
  validateMapInputs,
} = require('@middleware/mapsMiddleware'); // Changed from '@middleware/merchant/mapsMiddleware'

router
  .route('/predictions')
  .get(authenticateMerchant, validateMapInputs, mapsController.getPlacePredictions);

router
  .route('/details')
  .get(authenticateMerchant, validateMapInputs, mapsController.getPlaceDetails);

router
  .route('/update-address')
  .patch(authenticateMerchant, hasAddressPermission, validateMapInputs, mapsController.updateMerchantAddress);

module.exports = router;