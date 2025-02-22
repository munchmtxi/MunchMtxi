// @routes/merchantRoutes/profileRoutes/passwordRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, hasMerchantPermission } = require('@middleware/authMiddleware');
const { validatePasswordChange } = require('@validators/merchantValidators/profileValidators/passwordValidator');
const passwordController = require('@controllers/merchantControllers/profileControllers/passwordController');

router.use(authenticate);
router.use(hasMerchantPermission('profile.manage'));

router
  .route('/password')
  .put(validatePasswordChange, passwordController.changePassword);

router
  .route('/password/history')
  .get(passwordController.getPasswordHistory);

router
  .route('/password/strength')
  .get(passwordController.getPasswordStrength);

module.exports = router;