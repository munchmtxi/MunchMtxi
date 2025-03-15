// src/routes/merchant/profile/passwordRoutes.js
const express = require('express');
const router = express.Router();
const passwordController = require('@controllers/merchant/profile/passwordController');
const { validateChangePassword } = require('@validators/passwordValidators');
const { restrictTo } = require('@middleware/authMiddleware');

router.post('/change', restrictTo('merchant'), validateChangePassword, passwordController.changePassword);
router.get('/history', restrictTo('merchant'), passwordController.getPasswordHistory);
router.get('/strength', restrictTo('merchant'), passwordController.getPasswordStrength);

module.exports = router;