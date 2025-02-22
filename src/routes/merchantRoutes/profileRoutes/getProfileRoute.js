// src/routes/merchantRoutes/profileRoutes/getProfileRoute.js
const express = require('express');
const router = express.Router();

// Import the controller function directly
const { getProfile } = require('@controllers/merchantControllers/profileControllers/getProfileController');
const { protect, hasMerchantPermission } = require('@middleware/authMiddleware');
const { validateGetProfile } = require('@validators/merchantValidators/profileValidators/getProfileValidator');

// Use the function directly
router.get(
  '/',
  protect,
  hasMerchantPermission('VIEW_PROFILE'),
  validateGetProfile,
  getProfile  // Use the exported function
);

module.exports = router;