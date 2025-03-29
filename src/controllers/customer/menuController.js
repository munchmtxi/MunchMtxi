'use strict';

const MenuService = require('@services/customer/menuService');
const catchAsync = require('@utils/catchAsync');
const { logger } = require('@utils/logger');

/**
 * Menu Controller - Handles customer menu requests
 */
class MenuController {
  /**
   * Fetches menu items for a merchant
   */
  static getMenuItems = catchAsync(async (req, res) => {
    const { merchantId, branchId, categoryId } = req.query;
    const customerId = req.user.id; // From middleware

    logger.info('Fetching menu items', { customerId, merchantId, branchId, categoryId });

    const menuData = await MenuService.getMenuItems({
      customerId,
      merchantId: merchantId ? Number(merchantId) : undefined,
      branchId: branchId ? Number(branchId) : undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
    });

    res.status(200).json(menuData);
  });
}

module.exports = MenuController;