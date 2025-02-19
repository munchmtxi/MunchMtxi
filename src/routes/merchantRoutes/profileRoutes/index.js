// src/routes/merchantRoutes/profileRoutes/index.js
const { Router } = require('express');
const { updateProfile } = require('@controllers/merchantControllers/profileControllers/profileController');
const { authenticate, authorize } = require('@middleware/authMiddleware');

const router = Router();

// Profile management routes
router.patch(
  '/',
  authenticate,
  authorize('update', 'merchant_profile'),
  updateProfile
);

// Export profile routes
module.exports = router;