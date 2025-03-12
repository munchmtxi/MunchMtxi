const BusinessTypeService = require('@services/merchant/profile/businessTypeService');
const catchAsync = require('@utils/catchAsync');
const { Merchant } = require('@models');
const AppError = require('@utils/AppError');

const BusinessTypeController = {
  updateBusinessType: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');
    const merchantId = merchant.id;
    const updateData = req.body;

    const updatedMerchant = await BusinessTypeService.updateBusinessType(merchantId, userId, updateData);

    res.status(200).json({
      status: 'success',
      message: 'Business type updated successfully',
      data: updatedMerchant,
    });
  }),

  getBusinessTypeRequirements: catchAsync(async (req, res) => {
    const { type } = req.params; // Match route param :type
    const requirements = await BusinessTypeService.getBusinessTypeRequirements(type);

    res.status(200).json({
      status: 'success',
      data: requirements,
    });
  }),

  getBusinessType: catchAsync(async (req, res) => {
    const userId = req.user.id;
    const merchant = await Merchant.findOne({ where: { user_id: userId } });
    if (!merchant) throw new AppError('Merchant not found', 404, 'MERCHANT_NOT_FOUND');

    res.status(200).json({
      status: 'success',
      data: {
        business_type: merchant.business_type,
        business_type_details: merchant.business_type_details,
      },
    });
  }),
};

module.exports = BusinessTypeController;