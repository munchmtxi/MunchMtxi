// src/routes/staff/profile/staffProfileRoutes.js
'use strict';

const express = require('express');
const { authenticate, authorizeRoles } = require('@middleware/authMiddleware');
const { attachStaffProfile } = require('@middleware/staff/staffProfileMiddleware');
const staffProfileController = require('@controllers/staff/profile/staffProfileController');
const { logger } = require('@utils/logger');

const router = express.Router();

router.use((req, res, next) => {
  logger.info('Staff profile router hit', { method: req.method, url: req.url });
  next();
});

// Apply authentication and role restriction using role ID
router.use(authenticate);
router.use(authorizeRoles(4)); // Restrict to roleId: 4 (staff)
router.use(attachStaffProfile); // Ensures req.user.staff_profile is populated

// Define profile routes
router.get('/', staffProfileController.getProfile);
router.patch('/personal', staffProfileController.updatePersonalInfo);
router.patch('/vehicle', staffProfileController.updateVehicleInfo);
router.patch('/password', staffProfileController.changePassword);
router.patch('/2fa', staffProfileController.toggleTwoFactorAuth);

module.exports = router;