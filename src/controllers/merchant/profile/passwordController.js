// src/controllers/merchant/profile/passwordController.js
'use strict';
const merchantPasswordService = require('@services/merchant/profile/merchantPasswordService');

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, passwordConfirmation } = req.body;
    console.log('Controller Received:', req.body); // Debug log
    const merchantId = req.user.id;
    const clientIp = req.ip;
    const result = await merchantPasswordService.changePassword(
      merchantId,
      { currentPassword, newPassword, passwordConfirmation },
      clientIp
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

exports.getPasswordHistory = async (req, res, next) => {
  try {
    const merchantId = req.user.id;
    const history = await merchantPasswordService.getPasswordHistory(merchantId);
    res.status(200).json(history);
  } catch (error) {
    next(error);
  }
};

exports.getPasswordStrength = async (req, res, next) => {
  try {
    const merchantId = req.user.id;
    const strength = await merchantPasswordService.getPasswordStrength(merchantId);
    res.status(200).json(strength);
  } catch (error) {
    next(error);
  }
};