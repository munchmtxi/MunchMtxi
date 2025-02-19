// src/routes/merchantRoutes/profileRoutes/profileRoutes.js
const { Router } = require('express');
const { updateProfile } = require('@controllers/merchantControllers/profileControllers/profileController');
const { authenticate, authorize } = require('@middleware/authMiddleware');

const router = Router();

router.patch(
  '/',
  authenticate,
  authorize('update', 'merchant_profile'),
  updateProfile
);

module.exports = router;