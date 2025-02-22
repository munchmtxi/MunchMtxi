// src/routes/merchantRoutes/profileRoutes/previewRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });

// Import middleware
const {
  authenticate,
  hasMerchantPermission,
  isResourceOwner,
  checkRoleBasedRateLimit
} = require('@middleware/authMiddleware');

const { performanceMiddleware } = require('@middleware/performanceMiddleware');
const { logRequest } = require('@middleware/requestLogger');
const { validateRequest } = require('@middleware/validateRequest');
const { checkActivePreview } = require('@middleware/previewMiddleware');

// Import controllers - verify this path matches your project structure
const {
  startPreview,
  getPreview, 
  updatePreview,
  endPreview,
  sharePreview,
  revokePreviewAccess,
  getPreviewStatus
} = require('@controllers/merchantControllers/profileControllers/previewController');

// Import validators
const {
  startPreviewSchema,
  previewUpdateSchema, 
  sharePreviewSchema
} = require('@validators/merchantValidators/profileValidators/previewValidator');

// Apply base middleware
router.use(authenticate);
router.use(checkRoleBasedRateLimit('merchant'));
router.use(logRequest);
router.use(performanceMiddleware);

// Preview session management
router.post('/',
  hasMerchantPermission('profile.edit'),
  isResourceOwner,
  validateRequest(startPreviewSchema),
  checkActivePreview,
  startPreview  // Controller exists now
);

router.get('/',
  hasMerchantPermission('profile.view'),
  isResourceOwner,
  getPreview  // Controller exists now
);

router.post('/update',
  hasMerchantPermission('profile.edit'),
  isResourceOwner,
  validateRequest(previewUpdateSchema),
  updatePreview  // Controller exists now
);

router.post('/end',
  hasMerchantPermission('profile.edit'),
  isResourceOwner,
  endPreview  // Controller exists now
);

router.post('/share',
  hasMerchantPermission('profile.share'),
  isResourceOwner,
  validateRequest(sharePreviewSchema),
  sharePreview  // Controller exists now
);

router.delete('/share',
  hasMerchantPermission('profile.share'),
  isResourceOwner,
  revokePreviewAccess  // Controller exists now
);

router.get('/status',
  hasMerchantPermission('profile.view'),
  isResourceOwner,
  getPreviewStatus  // Controller exists now
);

module.exports = router;