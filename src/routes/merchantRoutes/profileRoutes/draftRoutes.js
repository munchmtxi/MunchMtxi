// src/routes/merchantRoutes/profileRoutes/draftRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });

// Import middleware
const {
  authenticate,
  hasMerchantPermission,
  isResourceOwner,
  verifyStaffAccess
} = require('@middleware/authMiddleware');

// Import rate limiter
const { checkRoleBasedRateLimit } = require('@middleware/rateLimiter');

// Import controller functions
const {
  saveDraft,
  getDraft,
  submitDraft
} = require('@controllers/merchantControllers/profileControllers/draftController');

// Apply middleware
router.use(authenticate);
router.use(checkRoleBasedRateLimit('merchant')); // Use the function correctly

// Draft view/save routes
router.get('/',
  hasMerchantPermission('profile.view'),
  isResourceOwner,
  getDraft
);

router.post('/',
  hasMerchantPermission('profile.edit'),
  isResourceOwner,
  saveDraft
);

// Submit draft route
router.post('/submit',
  hasMerchantPermission('profile.edit'),
  isResourceOwner,
  submitDraft
);

// Staff access route
router.get('/staff/view',
  verifyStaffAccess(['reviewer', 'admin']),
  hasMerchantPermission('profile.view'),
  getDraft
);

module.exports = router;