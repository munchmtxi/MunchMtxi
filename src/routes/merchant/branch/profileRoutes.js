// src/routes/merchant/branch/profileRoutes.js
'use strict';
const express = require('express');
const router = express.Router();
const branchProfileController = require('@controllers/merchant/branch/branchProfileController');
const {
  authenticateBranchMerchant,
  verifyBranchOwnership,
  hasBranchPermission,
  validateBranchInputs,
} = require('@middleware/branchProfileMiddleware'); // Updated import
const multer = require('multer');
const { logger } = require('@utils/logger');

// Configure multer for file uploads (logo and banner)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
      logger.warn('Invalid file type uploaded', { mimetype: file.mimetype });
      return cb(new Error('Only JPEG, PNG, and WebP files are allowed'));
    }
    cb(null, true);
  },
}).fields([
  { name: 'logo', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
]);

// Routes
router.post(
  '/',
  authenticateBranchMerchant,
  hasBranchPermission('create'),
  validateBranchInputs,
  upload,
  branchProfileController.createBranchProfile
);

router.get(
  '/predictions',
  authenticateBranchMerchant,
  validateBranchInputs,
  branchProfileController.getAddressPredictions
);

router.get(
  '/',
  authenticateBranchMerchant,
  branchProfileController.listBranchProfiles
);

router.get(
  '/:branchId',
  authenticateBranchMerchant,
  verifyBranchOwnership,
  branchProfileController.getBranchProfile
);

router.patch(
  '/:branchId',
  authenticateBranchMerchant,
  verifyBranchOwnership,
  hasBranchPermission('update'),
  validateBranchInputs,
  upload,
  branchProfileController.updateBranchProfile
);

router.delete(
  '/:branchId',
  authenticateBranchMerchant,
  verifyBranchOwnership,
  hasBranchPermission('delete'),
  branchProfileController.deleteBranchProfile
);

module.exports = router;