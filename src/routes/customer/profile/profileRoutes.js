'use strict';
const express = require('express');
const router = express.Router();
const {
  getProfileController,
  updateProfileController,
  changePasswordController,
  managePaymentMethodsController,
} = require('@controllers/customer/profile/profileController');
const { authenticate } = require('@middleware/authMiddleware');
const { restrictToCustomer } = require('@middleware/customer/customerMiddleware');
const { validateChangePassword } = require('@validators/passwordValidators');

router.use(authenticate, restrictToCustomer);

router.get('/', getProfileController);
router.put('/', updateProfileController);
router.put('/password', validateChangePassword, changePasswordController);
router.put('/payment-methods', managePaymentMethodsController);

module.exports = router;