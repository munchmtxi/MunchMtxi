// src/routes/merchant/profile/getProfileRoutes.js
'use strict';

const express = require('express');
const router = express.Router();
const getProfileController = require('@controllers/merchant/profile/getProfile');
const { protect, restrictTo } = require('@middleware/authMiddleware');

router.get(
  '/:merchantId',
  protect, // Ensures JWT authentication
  restrictTo('merchant'), // Restricts to 'merchant' role
  getProfileController.getProfile
);

module.exports = router;