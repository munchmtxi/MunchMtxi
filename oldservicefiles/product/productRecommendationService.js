// services/merchantServices/productServices/productRecommendationService.js
const { Op } = require('sequelize');
const { MenuInventory, Order, OrderItem, Customer } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

/**
 * Get trending products for a merchant based on sales and engagement metrics
 * @param {number} merchantId - The merchant ID
 * @param {number|null} branchId - Optional branch ID
 * @param {number} limit - Number of products to return
 * @param {string} period - Time period to consider ('day', 'week', 'month', 'quarter')
 * @returns {Promise<Array>} - Array of trending products with metrics
 */
exports.getTrendingProducts = async (merchantId, branchId, limit = 10, period = 'week') => {
  try {
    // Calculate the date range based on the period
    const startDate = getPeriodStartDate(period);
    
    // Query to find products with the most orders in the given time period
    const query = {
      attributes: [
        'menu_item_id',
        [sequelize.fn('COUNT', sequelize.col('order_items.id')), 'order_count'],
        [sequelize.fn('SUM', sequelize.col('order_items.quantity')), 'total_quantity'],
      ],
      include: [
        {
          model: Order,
          as: 'order',
          attributes: [],
          where: {
            merchant_id: merchantId,
            created_at: { [Op.gte]: startDate },
            status: { [Op.notIn]: ['cancelled', 'rejected'] }
          },
        },
        {
          model: MenuInventory,
          as: 'menu_item',
          attributes: ['id', 'name', 'price', 'thumbnail_url', 'availability_status', 'is_featured'],
          where: {
            merchant_id: merchantId,
            is_published: true,
          },
        }
      ],
      group: ['menu_item_id', 'menu_item.id'],
      order: [[sequelize.literal('order_count'), 'DESC']],
      limit
    };
    
    // Add branch filter if provided
    if (branchId) {
      query.include[0].where.branch_id = branchId;
      query.include[1].where.branch_id = branchId;
    }
    
    const orderItems = await OrderItem.findAll(query);
    
    // Enhance the results with additional data
    const trendingProducts = orderItems.map(item => {
      const product = item.menu_item.toJSON();
      return {
        ...product,
        metrics: {
          order_count: parseInt(item.dataValues.order_count, 10),
          total_quantity: parseInt(item.dataValues.total_quantity, 10),
          popularity_score: calculatePopularityScore(
            parseInt(item.dataValues.order_count, 10),
            parseInt(item.dataValues.total_quantity, 10)
          ),
        }
      };
    });
    
    return trendingProducts;
  } catch (error) {
    logger.error(`Error fetching trending products for merchant ${merchantId}:`, error);
    throw new AppError('Failed to fetch trending products', 500);
  }
};

/**
 * Get cross-sell recommendations based on a specific product
 * @param {number} merchantId - The merchant ID
 * @param {number} productId - The product ID to find recommendations for
 * @param {number} limit - Number of recommendations to return
 * @returns {Promise<Array>} - Array of recommended products
 */
exports.getCrossSellRecommendations = async (merchantId, productId, limit = 5) => {
  try {
    // Find orders that contain the target product
    const ordersWithProduct = await Order.findAll({
      attributes: ['id'],
      include: [{
        model: OrderItem,
        as: 'items',
        where: { menu_item_id: productId },
        attributes: []
      }],
      where: {
        merchant_id: merchantId,
        status: { [Op.notIn]: ['cancelled', 'rejected'] }
      }
    });
    
    const orderIds = ordersWithProduct.map(order => order.id);
    
    if (orderIds.length === 0) {
      return [];
    }
    
    // Find products frequently purchased together with the target product
    const recommendedItems = await OrderItem.findAll({
      attributes: [
        'menu_item_id',
        [sequelize.fn('COUNT', sequelize.col('order_id')), 'order_count']
      ],
      include: [{
        model: MenuInventory,
        as: 'menu_item',
        attributes: ['id', 'name', 'price', 'thumbnail_url', 'availability_status'],
        where: {
          merchant_id: merchantId,
          id: { [Op.ne]: productId },  // Exclude the target product
          is_published: true,
          availability_status: 'in-stock'
        }
      }],
      where: {
        order_id: { [Op.in]: orderIds },
        menu_item_id: { [Op.ne]: productId }  // Exclude the target product
      },
      group: ['menu_item_id', 'menu_item.id'],
      order: [[sequelize.literal('order_count'), 'DESC']],
      limit
    });
    
    return recommendedItems.map(item => {
      const product = item.menu_item.toJSON();
      return {
        ...product,
        frequency_score: parseInt(item.dataValues.order_count, 10) / orderIds.length
      };
    });
  } catch (error) {
    logger.error(`Error fetching cross-sell recommendations for product ${productId}:`, error);
    throw new AppError('Failed to fetch cross-sell recommendations', 500);
  }
};

/**
 * Get personalized product recommendations for a customer
 * @param {number} merchantId - The merchant ID
 * @param {number} customerId - The customer ID
 * @param {number} limit - Number of recommendations to return
 * @returns {Promise<Array>} - Array of recommended products
 */
exports.getPersonalizedRecommendations = async (merchantId, customerId, limit = 10) => {
  try {
    // Get customer's order history
    const customerOrders = await Order.findAll({
      attributes: ['id'],
      where: {
        merchant_id: merchantId,
        customer_id: customerId,
        status: 'completed'
      },
      order: [['created_at', 'DESC']],
      limit: 10 // Consider most recent orders
    });
    
    const orderIds = customerOrders.map(order => order.id);
    
    if (orderIds.length === 0) {
      // If customer has no orders, fall back to trending products
      return this.getTrendingProducts(merchantId, null, limit, 'month');
    }
    
    // Get categories the customer has purchased from
    const customerCategories = await OrderItem.findAll({
      attributes: [
        [sequelize.fn('DISTINCT', sequelize.col('menu_item.category_id')), 'category_id']
      ],
      include: [{
        model: MenuInventory,
        as: 'menu_item',
        attributes: []
      }],
      where: {
        order_id: { [Op.in]: orderIds }
      },
      raw: true
    });
    
    const categoryIds = customerCategories
      .map(item => item.category_id)
      .filter(id => id !== null);
    
    // Get previously purchased products
    const purchasedProducts = await OrderItem.findAll({
      attributes: ['menu_item_id'],
      where: {
        order_id: { [Op.in]: orderIds }
      },
      raw: true
    });
    
    const purchasedProductIds = purchasedProducts.map(item => item.menu_item_id);
    
    // Find products in the same categories that the customer hasn't purchased yet
    const recommendedProducts = await MenuInventory.findAll({
      where: {
        merchant_id: merchantId,
        is_published: true,
        availability_status: 'in-stock',
        category_id: { [Op.in]: categoryIds },
        id: { [Op.notIn]: purchasedProductIds }
      },
      order: [['is_featured', 'DESC'], ['created_at', 'DESC']],
      limit
    });
    
    return recommendedProducts;
  } catch (error) {
    logger.error(`Error fetching personalized recommendations for customer ${customerId}:`, error);
    throw new AppError('Failed to fetch personalized recommendations', 500);
  }
};

/**
 * Get seasonal product recommendations based on current time and location
 * @param {number} merchantId - The merchant ID
 * @param {number} limit - Number of recommendations to return
 * @param {string} location - Optional location info
 * @returns {Promise<Array>} - Array of recommended seasonal products
 */
exports.getSeasonalRecommendations = async (merchantId, limit = 10, location = null) => {
  try {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    
    // Define seasonal tags based on the current month
    const seasonalTags = getSeasonalTags(currentMonth, location);
    
    // Find products with matching seasonal tags
    const seasonalProducts = await MenuInventory.findAll({
      where: {
        merchant_id: merchantId,
        is_published: true,
        availability_status: 'in-stock',
        tags: { [Op.overlap]: seasonalTags }
      },
      order: [['is_featured', 'DESC'], ['created_at', 'DESC']],
      limit
    });
    
    return seasonalProducts;
  } catch (error) {
    logger.error(`Error fetching seasonal recommendations for merchant ${merchantId}:`, error);
    throw new AppError('Failed to fetch seasonal recommendations', 500);
  }
};

/**
 * Get recommendation metrics for merchant dashboard
 * @param {number} merchantId - The merchant ID
 * @returns {Promise<Object>} - Recommendation metrics data
 */
exports.getRecommendationMetrics = async (merchantId) => {
  try {
    // Get top products from the last 30 days
    const topProducts = await this.getTrendingProducts(merchantId, null, 5, 'month');
    
    // Calculate average sales increase when recommendations are followed
    // This would require tracking when recommendations are shown and if they result in a purchase
    // Simplified implementation:
    const recommendationMetrics = {
      topProducts: topProducts.map(product => ({
        id: product.id,
        name: product.name,
        orderCount: product.metrics.order_count,
        totalQuantity: product.metrics.total_quantity
      })),
      recommendationEffectiveness: {
        conversionRate: 0.15, // Example placeholder - in real implementation this would be calculated
        averageOrderIncrease: 0.22 // Example placeholder
      }
    };
    
    return recommendationMetrics;
  } catch (error) {
    logger.error(`Error fetching recommendation metrics for merchant ${merchantId}:`, error);
    throw new AppError('Failed to fetch recommendation metrics', 500);
  }
};

// Helper functions

/**
 * Calculate start date based on period
 * @param {string} period - Time period ('day', 'week', 'month', 'quarter')
 * @returns {Date} - The start date
 */
function getPeriodStartDate(period) {
  const now = new Date();
  switch (period) {
    case 'day':
      return new Date(now.setDate(now.getDate() - 1));
    case 'week':
      return new Date(now.setDate(now.getDate() - 7));
    case 'month':
      return new Date(now.setMonth(now.getMonth() - 1));
    case 'quarter':
      return new Date(now.setMonth(now.getMonth() - 3));
    default:
      return new Date(now.setDate(now.getDate() - 7)); // Default to week
  }
}

/**
 * Calculate popularity score based on order count and quantity
 * @param {number} orderCount - Number of orders
 * @param {number} totalQuantity - Total quantity sold
 * @returns {number} - Calculated popularity score
 */
function calculatePopularityScore(orderCount, totalQuantity) {
  // Simple scoring algorithm - can be customized based on business needs
  return (orderCount * 0.7) + (totalQuantity * 0.3);
}

/**
 * Get seasonal tags based on the current month and location
 * @param {number} month - Current month (1-12)
 * @param {string} location - Optional location info
 * @returns {Array<string>} - Array of seasonal tags
 */
function getSeasonalTags(month, location) {
  // These would be customized based on the business and region
  const seasons = {
    1: ['winter', 'new-year'],
    2: ['winter', 'valentine'],
    3: ['spring', 'easter'],
    4: ['spring'],
    5: ['spring', 'summer'],
    6: ['summer'],
    7: ['summer', 'bbq'],
    8: ['summer', 'bbq'],
    9: ['fall', 'back-to-school'],
    10: ['fall', 'halloween'],
    11: ['fall', 'thanksgiving'],
    12: ['winter', 'christmas', 'holiday']
  };
  
  // Add location-specific tags if available
  let tags = seasons[month] || [];
  
  if (location) {
    // Example implementation - would be expanded based on actual business logic
    if (location.toLowerCase().includes('africa')) {
      tags = tags.filter(tag => !['thanksgiving', 'halloween'].includes(tag));
      // Add region-specific tags
    }
  }
  
  return tags;
}