// src/routes/merchant/profile/businessTypeRoutes.js
const express = require('express');
const BusinessTypeController = require('@controllers/merchant/profile/businessTypeController');
const { protect, restrictTo } = require('@middleware/authMiddleware');

const router = express.Router();

router.use(protect);
router.use(restrictTo('merchant'));

router
  .route('/')
  .put(BusinessTypeController.updateBusinessType)
  .get(BusinessTypeController.validateBusinessTypeConfig);

router.get('/requirements/:businessType', BusinessTypeController.getBusinessTypeRequirements);

module.exports = router;