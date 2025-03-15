// src/controllers/merchant/profile/getProfileController.js
'use strict';
const { Merchant } = require('@models');
const { logger } = require('@utils/logger');

const getMerchantProfile = async (req, res, next) => {
  try {
    const { merchantId } = req.params;
    logger.info('Fetching public merchant profile', { merchantId });

    const merchant = await Merchant.findByPk(merchantId, {
      attributes: [
        'id',
        'business_name',
        'business_type',
        'address',
        'phone_number',
        'currency',
        'time_zone',
        'business_hours'
      ]
    });

    if (!merchant) {
      return res.status(404).json({ status: 'fail', message: 'Merchant not found' });
    }

    res.status(200).json({ status: 'success', data: merchant });
  } catch (error) {
    logger.error('Error fetching merchant profile', { error: error.message });
    next(error);
  }
};

module.exports = { getMerchantProfile };