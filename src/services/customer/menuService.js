'use strict';

const { Op } = require('sequelize');
const { MenuInventory, Merchant, MerchantBranch, ProductDiscount } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

/**
 * Menu Service - Provides menu items and merchant details for customers
 */
class MenuService {
  /**
   * Retrieves menu items with merchant and branch details
   * @param {Object} options - Filtering options
   * @param {number} options.customerId - Customer ID from auth
   * @param {number} [options.merchantId] - Filter by merchant ID
   * @param {number} [options.branchId] - Filter by branch ID
   * @param {number} [options.categoryId] - Filter by category ID
   * @param {boolean} [options.onlyAvailable=true] - Only return in-stock items
   * @returns {Promise<Object>} Merchant and menu item details
   */
  static async getMenuItems({ customerId, merchantId, branchId, categoryId, onlyAvailable = true }) {
    try {
      // Validate customerId presence
      if (!customerId) throw new AppError('Customer ID is required', 400);

      // Build where clause for MenuInventory
      const menuWhere = { is_published: true };
      if (merchantId) menuWhere.merchant_id = merchantId;
      if (branchId) menuWhere.branch_id = branchId;
      if (categoryId) menuWhere.category_id = categoryId;
      if (onlyAvailable) menuWhere.availability_status = 'in-stock';

      // Fetch data
      const menuItems = await MenuInventory.findAll({
        where: menuWhere,
        include: [
          {
            model: Merchant,
            as: 'merchant',
            attributes: ['id', 'business_name', 'business_type', 'logo_url', 'currency'],
            required: true,
          },
          {
            model: MerchantBranch,
            as: 'branch',
            attributes: ['id', 'name', 'contact_phone', 'address', 'operating_hours'],
            required: false,
          },
          {
            model: ProductDiscount,
            as: 'discounts',
            where: {
              is_active: true,
              [Op.or]: [
                { end_date: null },
                { end_date: { [Op.gte]: new Date() } },
              ],
              [Op.or]: [
                { start_date: null },
                { start_date: { [Op.lte]: new Date() } },
              ],
            },
            required: false,
          },
        ],
        order: [['display_order', 'ASC']],
      });

      // Handle case where merchant exists but no items match
      if (!menuItems.length && merchantId) {
        const merchant = await Merchant.findByPk(merchantId);
        if (!merchant) throw new AppError('Merchant not found', 404);
        return {
          status: 'success',
          data: {
            merchant: {
              id: merchant.id,
              business_name: merchant.business_name,
              business_type: merchant.business_type,
              logo_url: merchant.logo_url,
              currency: merchant.currency,
            },
            branch: null,
            items: [],
          },
        };
      }

      // Extract merchant and branch data (assuming single merchant/branch per request)
      const merchantData = menuItems[0]?.merchant || null;
      const branchData = branchId && menuItems[0]?.branch ? menuItems[0].branch : null;

      // Format menu items
      const items = menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        price: Number(item.price),
        final_price: Number(item.calculateFinalPrice()),
        description: item.description || 'No description available',
        availability_status: item.availability_status,
        quantity: Number(item.quantity),
        images: item.images || [],
        thumbnail_url: item.thumbnail_url,
        category_id: item.category_id,
        preparation_time_minutes: item.preparation_time_minutes,
        is_featured: item.is_featured,
      }));

      const response = {
        status: 'success',
        data: {
          merchant: merchantData
            ? {
                id: merchantData.id,
                business_name: merchantData.business_name,
                business_type: merchantData.business_type,
                logo_url: merchantData.logo_url,
                currency: merchantData.currency,
              }
            : null,
          branch: branchData
            ? {
                id: branchData.id,
                name: branchData.name,
                contact_phone: branchData.contact_phone,
                address: branchData.address,
                operating_hours: branchData.operating_hours,
              }
            : null,
          items,
        },
      };

      logger.info('Menu items retrieved', { customerId, merchantId, itemCount: items.length });
      return response;
    } catch (error) {
      logger.error('Error in getMenuItems', { error: error.message });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve menu items', 500);
    }
  }
}

module.exports = MenuService;