// src/routes/merchant/profile/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('@controllers/merchant/profile/profileController');
const { authenticate, restrictTo } = require('@middleware/authMiddleware');

router.use(authenticate);
router.use(restrictTo('merchant'));

router.route('/')
  .get(profileController.getProfile)
  .patch(profileController.updateProfile);

router.patch('/business-hours', profileController.updateBusinessHours);
router.patch('/delivery-settings', profileController.updateDeliverySettings);

router.route('/branches')
  .post(profileController.createBranch);

router.route('/branches/:branchId')
  .patch(profileController.updateBranch);

module.exports = router;