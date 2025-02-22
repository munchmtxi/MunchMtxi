// src/routes/merchantRoutes/profileRoutes/activityRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });

const {
  authenticate,
  hasMerchantPermission,
  isResourceOwner,
  checkRoleBasedRateLimit
} = require('@middleware/authMiddleware');

const {
  getActivityLogs,
  getActivityDetails,
  getActivityStats
} = require('@controllers/merchantControllers/profileControllers/activityController');

// Apply base middleware
router.use(authenticate);
router.use(checkRoleBasedRateLimit('merchant'));

// Activity log routes
router.get(
  '/',
  hasMerchantPermission('profile.view'),
  isResourceOwner('merchantId'),
  getActivityLogs
);

router.get(
  '/stats',
  hasMerchantPermission('profile.view'),
  isResourceOwner('merchantId'),
  getActivityStats
);

router.get(
  '/:activityId',
  hasMerchantPermission('profile.view'),
  isResourceOwner('merchantId'),
  getActivityDetails
);

module.exports = router;