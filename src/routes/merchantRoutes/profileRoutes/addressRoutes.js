// @routes/merchantRoutes/profileRoutes/addressRoutes.js
const { Router } = require('express');
const { hasMerchantPermission } = require('@middleware/authMiddleware');
const {
  getAddressSuggestions,
  getAddressDetails,
  updateMerchantAddress
} = require('@controllers/merchantControllers/profileControllers/addressController');
const { 
  validateAddressUpdate 
} = require('@validators/merchantValidators/profileValidators/addressValidator');

const router = Router();

router.get(
  '/suggestions',
  hasMerchantPermission('update_profile'),
  getAddressSuggestions
);

router.get(
  '/details/:placeId',
  hasMerchantPermission('update_profile'),
  getAddressDetails
);

router.patch(
  '/',
  hasMerchantPermission('update_profile'),
  validateAddressUpdate,
  updateMerchantAddress
);

module.exports = router;