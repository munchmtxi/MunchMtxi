'use strict';

const express = require('express');
const { authenticate, authorizeRoles } = require('@middleware/authMiddleware');
const { attachDriverProfile } = require('@middleware/driver/driverProfileMiddleware');
const driverProfileController = require('@controllers/driver/profile/driverProfileController');
const { logger } = require('@utils/logger');

const router = express.Router();

router.use((req, res, next) => {
  logger.info('Driver profile router hit', { method: req.method, url: req.url });
  next();
});

router.use(authenticate);
router.use(authorizeRoles(3)); // Assuming role_id 3 is for drivers
router.use(attachDriverProfile); // Ensures req.user.driver_profile is populated

router.get('/', driverProfileController.getProfile);
router.patch('/personal', driverProfileController.updatePersonalInfo);
router.patch('/vehicle', driverProfileController.updateVehicleInfo);
router.patch('/password', driverProfileController.changePassword);

module.exports = router;