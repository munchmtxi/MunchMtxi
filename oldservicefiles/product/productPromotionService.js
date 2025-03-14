'use strict';

const { Op } = require('sequelize');
const db = require('@models');
const AppError = require('@utils/AppError');
const { logger, logTransactionEvent } = require('@utils/logger');

/**
 * Create a new product promotion
 * @param {Object} promotionData - The promotion data
 * @param {Number} merchantId - The merchant ID
 * @returns {Promise<Object>} - The created promotion
 */
exports.createPromotion = async (promotionData, merchantId) => {
  // Validate merchant exists
  const merchant = await db.Merchant.findByPk(merchantId);
  if (!merchant) {
    throw new AppError('Merchant not found', 404);
  }

  const transaction = await db.sequelize.transaction();

  try {
    // Check for conflicting promotion codes
    if (promotionData.code) {
      const existingCode = await db.ProductPromotion.findOne({
        where: {
          code: promotionData.code,
          merchant_id: merchantId
        }
      });

      if (existingCode) {
        throw new AppError('Promotion code already exists', 400);
      }
    }

    // Create the promotion
    const promotion = await db.ProductPromotion.create({
      ...promotionData,
      merchant_id: merchantId
    }, { transaction });

    // Create promotion rules if provided
    if (promotionData.rules && Array.isArray(promotionData.rules)) {
      const rules = promotionData.rules.map(rule => ({
        ...rule,
        promotion_id: promotion.id
      }));

      await db.PromotionRule.bulkCreate(rules, { transaction });
    }

    // Associate with menu items if provided
    if (promotionData.menuItemIds && Array.isArray(promotionData.menuItemIds)) {
      // Verify the menu items belong to this merchant
      const menuItems = await db.MenuInventory.findAll({
        where: {
          id: {
            [Op.in]: promotionData.menuItemIds
          },
          merchant_id: merchantId
        }
      });

      if (menuItems.length !== promotionData.menuItemIds.length) {
        throw new AppError('One or more menu items do not exist or do not belong to this merchant', 400);
      }

      const menuItemAssociations = promotionData.menuItemIds.map(menuItemId => ({
        promotion_id: promotion.id,
        menu_item_id: menuItemId
      }));

      await db.PromotionMenuItem.bulkCreate(menuItemAssociations, { transaction });
    }

    await transaction.commit();

    logTransactionEvent({
      event: 'promotion_created',
      user_id: promotionData.created_by,
      merchant_id: merchantId,
      data: { promotion_id: promotion.id, promotion_name: promotion.name }
    });

    // Return the created promotion with associations
    return await getPromotionById(promotion.id, merchantId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Get a promotion by ID
 * @param {Number} promotionId - The promotion ID
 * @param {Number} merchantId - The merchant ID for validation
 * @returns {Promise<Object>} - The promotion
 */
exports.getPromotionById = async (promotionId, merchantId) => {
  const promotion = await db.ProductPromotion.findOne({
    where: {
      id: promotionId,
      merchant_id: merchantId
    },
    include: [
      {
        model: db.PromotionRule,
        as: 'rules',
        attributes: ['id', 'rule_type', 'conditions', 'priority']
      },
      {
        model: db.MenuInventory,
        as: 'promotionItems',
        attributes: ['id', 'name', 'price', 'description', 'image_url'],
        through: { attributes: [] } // Exclude junction table attributes
      },
      {
        model: db.PromotionRedemption,
        as: 'redemptions',
        attributes: ['id', 'discount_amount', 'redeemed_at'],
        include: [
          {
            model: db.Customer,
            as: 'customer',
            attributes: ['id', 'name', 'email', 'phone_number']
          },
          {
            model: db.Order,
            as: 'order',
            attributes: ['id', 'order_number', 'total_amount']
          }
        ],
        limit: 10, // Limit to latest 10 redemptions
        order: [['redeemed_at', 'DESC']]
      }
    ]
  });

  if (!promotion) {
    return null;
  }

  return promotion;
};

/**
 * Get all promotions for a merchant with filtering
 * @param {Number} merchantId - The merchant ID
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} - List of promotions
 */
exports.getPromotions = async (merchantId, filters = {}) => {
  const { 
    isActive, 
    type, 
    search, 
    startDate, 
    endDate, 
    isFlashSale,
    limit = 50, 
    offset = 0 
  } = filters;

  // Build where clause
  const where = { merchant_id: merchantId };

  if (isActive !== undefined) {
    where.is_active = isActive === 'true' || isActive === true;
  }

  if (type) {
    where.type = type;
  }

  if (isFlashSale !== undefined) {
    where.is_flash_sale = isFlashSale === 'true' || isFlashSale === true;
  }

  // Date filtering
  if (startDate || endDate) {
    // For active promotions that overlap with the specified date range
    const dateFilter = {};
    
    if (startDate) {
      dateFilter[Op.or] = [
        { start_date: { [Op.gte]: new Date(startDate) } },
        { start_date: { [Op.lte]: new Date(startDate) }, end_date: { [Op.gte]: new Date(startDate) } }
      ];
    }
    
    if (endDate) {
      dateFilter[Op.or] = [
        ...(dateFilter[Op.or] || []),
        { end_date: { [Op.lte]: new Date(endDate) } },
        { start_date: { [Op.lte]: new Date(endDate) }, end_date: { [Op.gte]: new Date(endDate) } }
      ];
    }
    
    where[Op.and] = [dateFilter];
  }

  // Search filtering
  if (search) {
    where[Op.or] = [
      { name: { [Op.like]: `%${search}%` } },
      { description: { [Op.like]: `%${search}%` } },
      { code: { [Op.like]: `%${search}%` } }
    ];
  }

  return await db.ProductPromotion.findAndCountAll({
    where,
    include: [
      {
        model: db.MenuInventory,
        as: 'promotionItems',
        attributes: ['id', 'name'],
        through: { attributes: [] } // Exclude junction table
      }
    ],
    limit: parseInt(limit, 10),
    offset: parseInt(offset, 10),
    order: [
      ['created_at', 'DESC']
    ]
  });
};

/**
 * Update a promotion
 * @param {Number} promotionId - The promotion ID
 * @param {Object} updateData - The data to update
 * @param {Number} merchantId - The merchant ID for validation
 * @returns {Promise<Object>} - The updated promotion
 */
exports.updatePromotion = async (promotionId, updateData, merchantId) => {
  // Find the promotion and verify merchant ownership
  const promotion = await db.ProductPromotion.findOne({
    where: {
      id: promotionId,
      merchant_id: merchantId
    }
  });

  if (!promotion) {
    return null;
  }

  const transaction = await db.sequelize.transaction();

  try {
    // Check code uniqueness if updating code
    if (updateData.code && updateData.code !== promotion.code) {
      const existingCode = await db.ProductPromotion.findOne({
        where: {
          code: updateData.code,
          merchant_id: merchantId,
          id: { [Op.ne]: promotionId }
        }
      });

      if (existingCode) {
        throw new AppError('Promotion code already exists', 400);
      }
    }

    // Update the promotion
    await promotion.update(updateData, { transaction });

    // Update rules if provided
    if (updateData.rules) {
      // Delete existing rules
      await db.PromotionRule.destroy({
        where: { promotion_id: promotionId },
        transaction
      });

      // Create new rules
      if (Array.isArray(updateData.rules) && updateData.rules.length > 0) {
        const rules = updateData.rules.map(rule => ({
          ...rule,
          promotion_id: promotionId
        }));

        await db.PromotionRule.bulkCreate(rules, { transaction });
      }
    }

    // Update menu item associations if provided
    if (updateData.menuItemIds) {
      // Verify the menu items belong to this merchant
      if (Array.isArray(updateData.menuItemIds) && updateData.menuItemIds.length > 0) {
        const menuItems = await db.MenuInventory.findAll({
          where: {
            id: {
              [Op.in]: updateData.menuItemIds
            },
            merchant_id: merchantId
          }
        });

        if (menuItems.length !== updateData.menuItemIds.length) {
          throw new AppError('One or more menu items do not exist or do not belong to this merchant', 400);
        }
      }

      // Delete existing associations
      await db.PromotionMenuItem.destroy({
        where: { promotion_id: promotionId },
        transaction
      });

      // Create new associations
      if (Array.isArray(updateData.menuItemIds) && updateData.menuItemIds.length > 0) {
        const menuItemAssociations = updateData.menuItemIds.map(menuItemId => ({
          promotion_id: promotionId,
          menu_item_id: menuItemId
        }));

        await db.PromotionMenuItem.bulkCreate(menuItemAssociations, { transaction });
      }
    }

    await transaction.commit();

    logTransactionEvent({
      event: 'promotion_updated',
      merchant_id: merchantId,
      data: { promotion_id: promotion.id, promotion_name: promotion.name }
    });

    // Return the updated promotion with associations
    return await getPromotionById(promotionId, merchantId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Delete a promotion
 * @param {Number} promotionId - The promotion ID
 * @param {Number} merchantId - The merchant ID for validation
 * @returns {Promise<Boolean>} - Success status
 */
exports.deletePromotion = async (promotionId, merchantId) => {
  const promotion = await db.ProductPromotion.findOne({
    where: {
      id: promotionId,
      merchant_id: merchantId
    }
  });

  if (!promotion) {
    return false;
  }

  const transaction = await db.sequelize.transaction();

  try {
    // Check if promotion has been used in orders
    const redemptions = await db.PromotionRedemption.count({
      where: { promotion_id: promotionId }
    });

    if (redemptions > 0) {
      // Soft delete by marking as inactive instead of actual deletion
      await promotion.update({
        is_active: false,
        code: `${promotion.code || 'deleted'}_${Date.now()}`  // Ensure code uniqueness for future promotions
      }, { transaction });
    } else {
      // Hard delete if never used
      await db.PromotionRule.destroy({
        where: { promotion_id: promotionId },
        transaction
      });

      await db.PromotionMenuItem.destroy({
        where: { promotion_id: promotionId },
        transaction
      });

      await promotion.destroy({ transaction });
    }

    await transaction.commit();

    logTransactionEvent({
      event: 'promotion_deleted',
      merchant_id: merchantId,
      data: { promotion_id: promotionId, promotion_name: promotion.name }
    });

    return true;
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

/**
 * Validate a promotion code for an order
 * @param {String} code - The promotion code
 * @param {Array} cartItems - Cart items with menu_item_id and quantity
 * @param {Number} customerId - The customer ID
 * @param {Number} merchantId - The merchant ID
 * @returns {Promise<Object>} - Validation result with discount info
 */
exports.validatePromoCode = async (code, cartItems, customerId, merchantId) => {
  if (!code || !cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
    throw new AppError('Invalid request data', 400);
  }

  // Find the promotion
  const promotion = await db.ProductPromotion.findOne({
    where: {
      code,
      merchant_id: merchantId,
      is_active: true,
      [Op.or]: [
        {
          [Op.and]: [
            { start_date: { [Op.lte]: new Date() } },
            { end_date: { [Op.gte]: new Date() } }
          ]
        },
        {
          [Op.and]: [
            { start_date: { [Op.lte]: new Date() } },
            { end_date: null }
          ]
        },
        {
          [Op.and]: [
            { start_date: null },
            { end_date: { [Op.gte]: new Date() } }
          ]
        },
        {
          [Op.and]: [
            { start_date: null },
            { end_date: null }
          ]
        }
      ]
    },
    include: [
      {
        model: db.PromotionRule,
        as: 'rules',
        attributes: ['id', 'rule_type', 'conditions', 'priority'],
        order: [['priority', 'DESC']]
      },
      {
        model: db.MenuInventory,
        as: 'promotionItems',
        attributes: ['id', 'name', 'price'],
        through: { attributes: [] }
      }
    ]
  });

  if (!promotion) {
    return {
      valid: false,
      message: 'Invalid or expired promotion code'
    };
  }

  // Check usage limit
  if (promotion.usage_limit !== null && promotion.usage_count >= promotion.usage_limit) {
    return {
      valid: false,
      message: 'Promotion usage limit has been reached'
    };
  }

  // Check customer eligibility
  if (promotion.customer_eligibility !== 'all') {
    const customer = await db.Customer.findByPk(customerId);
    if (!customer) {
      return {
        valid: false,
        message: 'Customer not found'
      };
    }

    // Get customer order history
    const orderCount = await db.Order.count({
      where: {
        customer_id: customerId,
        status: 'completed'
      }
    });

    // Apply customer eligibility rules
    if (promotion.customer_eligibility === 'new' && orderCount > 0) {
      return {
        valid: false,
        message: 'This promotion is for new customers only'
      };
    }

    if (promotion.customer_eligibility === 'returning' && orderCount === 0) {
      return {
        valid: false,
        message: 'This promotion is for returning customers only'
      };
    }

    if (promotion.customer_eligibility === 'loyalty') {
      // TODO: Implement loyalty check logic based on your system
      // This is a placeholder
      const isLoyaltyMember = orderCount >= 5;
      if (!isLoyaltyMember) {
        return {
          valid: false,
          message: 'This promotion is for loyalty members only'
        };
      }
    }
  }

  // Check if customer has already used this promotion if it's one-time use
  if (promotion.usage_limit === 1) {
    const alreadyUsed = await db.PromotionRedemption.findOne({
      where: {
        promotion_id: promotion.id,
        customer_id: customerId
      }
    });

    if (alreadyUsed) {
      return {
        valid: false,
        message: 'You have already used this promotion'
      };
    }
  }

  // Calculate cart total and eligible items
  let cartTotal = 0;
  let eligibleItems = [];
  let ineligibleItems = [];

  // Get menu item details for the cart
  const menuItemIds = cartItems.map(item => item.menu_item_id);
  const menuItems = await db.MenuInventory.findAll({
    where: {
      id: { [Op.in]: menuItemIds },
      merchant_id: merchantId
    }
  });

  // Create a map for easy access
  const menuItemMap = menuItems.reduce((map, item) => {
    map[item.id] = item;
    return map;
  }, {});

  // Process cart items
  for (const cartItem of cartItems) {
    const menuItem = menuItemMap[cartItem.menu_item_id];
    if (!menuItem) {
      ineligibleItems.push(cartItem);
      continue;
    }

    cartTotal += menuItem.price * cartItem.quantity;

    // Check if item is eligible for the promotion
    if (promotion.promotionItems.length === 0 || 
        promotion.promotionItems.some(item => item.id === menuItem.id)) {
      eligibleItems.push({
        ...cartItem,
        price: menuItem.price,
        name: menuItem.name,
        total: menuItem.price * cartItem.quantity
      });
    } else {
      ineligibleItems.push(cartItem);
    }
  }

  // Check minimum purchase amount
  if (promotion.min_purchase_amount > 0 && cartTotal < promotion.min_purchase_amount) {
    return {
      valid: false,
      message: `Minimum purchase amount of ${promotion.min_purchase_amount} not met`
    };
  }

  // Calculate discount based on promotion type
  let discountAmount = 0;
  let discountDetails = {};

  switch (promotion.type) {
    case 'percentage':
      // Apply percentage discount to eligible items
      discountAmount = eligibleItems.reduce((total, item) => {
        return total + (item.price * item.quantity * promotion.value / 100);
      }, 0);
      
      discountDetails = {
        percentage: promotion.value,
        appliedTo: eligibleItems.map(item => ({
          id: item.menu_item_id,
          name: item.name,
          originalPrice: item.price,
          quantity: item.quantity,
          discount: (item.price * item.quantity * promotion.value / 100).toFixed(2)
        }))
      };
      break;

    case 'fixed_amount':
      // Apply fixed discount to the total
      discountAmount = Math.min(promotion.value, cartTotal);
      
      discountDetails = {
        fixedAmount: promotion.value,
        appliedTotal: discountAmount.toFixed(2)
      };
      break;

    case 'buy_x_get_y':
      // Process BOGO rules
      for (const rule of promotion.rules) {
        if (rule.rule_type === 'product_quantity') {
          const { buy_quantity, get_quantity, discount_percent } = rule.conditions;
          
          // Group eligible items by product
          const itemsByProduct = {};
          for (const item of eligibleItems) {
            if (!itemsByProduct[item.menu_item_id]) {
              itemsByProduct[item.menu_item_id] = {
                ...item,
                applied: 0
              };
            } else {
              itemsByProduct[item.menu_item_id].quantity += item.quantity;
              itemsByProduct[item.menu_item_id].total += item.price * item.quantity;
            }
          }
          
          // Apply BOGO rules
          for (const productId in itemsByProduct) {
            const item = itemsByProduct[productId];
            const sets = Math.floor(item.quantity / (buy_quantity + get_quantity));
            const freebieItems = sets * get_quantity;
            
            if (freebieItems > 0) {
              const discountPerItem = item.price * (discount_percent / 100);
              const setDiscount = discountPerItem * freebieItems;
              
              discountAmount += setDiscount;
              item.applied = freebieItems;
              
              if (!discountDetails.buyXGetY) {
                discountDetails.buyXGetY = [];
              }
              
              discountDetails.buyXGetY.push({
                id: item.menu_item_id,
                name: item.name,
                sets,
                freeItems: freebieItems,
                discountPercent: discount_percent,
                totalDiscount: setDiscount.toFixed(2)
              });
            }
          }
        }
      }
      break;

    case 'bundle':
      // Process bundle discount rules
      for (const rule of promotion.rules) {
        if (rule.rule_type === 'product_quantity') {
          const { required_items, discount_percent } = rule.conditions;
          
          // Check if all required items are in the cart with sufficient quantity
          const bundleQualifies = required_items.every(req => {
            const cartItem = cartItems.find(item => item.menu_item_id == req.item_id);
            return cartItem && cartItem.quantity >= req.quantity;
          });
          
          if (bundleQualifies) {
            // Calculate bundle discount
            const bundleTotal = required_items.reduce((total, req) => {
              const menuItem = menuItemMap[req.item_id];
              return total + (menuItem ? menuItem.price * req.quantity : 0);
            }, 0);
            
            const bundleDiscount = bundleTotal * (discount_percent / 100);
            discountAmount += bundleDiscount;
            
            discountDetails.bundle = {
              items: required_items.map(req => {
                const menuItem = menuItemMap[req.item_id];
                return {
                  id: req.item_id,
                  name: menuItem ? menuItem.name : 'Unknown',
                  quantity: req.quantity
                };
              }),
              discountPercent: discount_percent,
              totalDiscount: bundleDiscount.toFixed(2)
            };
          }
        }
      }
      break;

    case 'loyalty':
      // Process loyalty discount rules
      // Simplified implementation - would integrate with your loyalty system
      discountAmount = eligibleItems.reduce((total, item) => {
        return total + (item.price * item.quantity * promotion.value / 100);
      }, 0);
      
      discountDetails = {
        loyaltyDiscount: promotion.value,
        appliedTotal: discountAmount.toFixed(2)
      };
      break;

    case 'flash_sale':
      // Similar to percentage but for flash sales
      discountAmount = eligibleItems.reduce((total, item) => {
        return total + (item.price * item.quantity * promotion.value / 100);
      }, 0);
      
      discountDetails = {
        flashSaleDiscount: promotion.value,
        appliedTotal: discountAmount.toFixed(2)
      };
      break;
  }

  // Round the discount to 2 decimal places
  discountAmount = Math.round(discountAmount * 100) / 100;

  return {
    valid: true,
    promotion: {
      id: promotion.id,
      name: promotion.name,
      code: promotion.code,
      type: promotion.type
    },
    discount: {
      amount: discountAmount,
      details: discountDetails
    },
    eligibleItems: eligibleItems.length,
    ineligibleItems: ineligibleItems.length,
    cartTotal: cartTotal,
    finalTotal: cartTotal - discountAmount
  };
};

/**
 * Get active flash sales for a merchant
 * @param {Number} merchantId - The merchant ID
 * @returns {Promise<Array>} - List of active flash sales
 */
exports.getActiveFlashSales = async (merchantId) => {
  return await db.ProductPromotion.findAll({
    where: {
      merchant_id: merchantId,
      is_active: true,
      is_flash_sale: true,
      [Op.or]: [
        {
          [Op.and]: [
            { start_date: { [Op.lte]: new Date() } },
            { end_date: { [Op.gte]: new Date() } }
          ]
        },
        {
          [Op.and]: [
            { start_date: { [Op.lte]: new Date() } },
            { end_date: null }
          ]
        }
      ]
    },
    include: [
      {
        model: db.MenuInventory,
        as: 'promotionItems',
        attributes: ['id', 'name', 'price', 'image_url'],
        through: { attributes: [] }
      }
    ]
  });
};

/**
 * Apply promotion to an order
 * @param {Number} orderId - Order ID
 * @param {String} promotionCode - Promotion code
 * @param {Number} customerId - Customer ID
 * @returns {Promise<Object>} - Updated order with applied promotion
 */
exports.applyPromotionToOrder = async (orderId, promotionCode, customerId) => {
  const order = await db.Order.findByPk(orderId, {
    include: [
      {
        model: db.MenuInventory,
        as: 'orderedItems',
        through: {
          attributes: ['quantity']
        }
      }
    ]
  });

  if (!order) {
    throw new AppError('Order not found', 404);
  }

  if (order.status !== 'pending') {
    throw new AppError('Cannot apply promotion to a non-pending order', 400);
  }

  // Format cart items from order
  const cartItems = order.orderedItems.map(item => ({
    menu_item_id: item.id,
    quantity: item.OrderItems.quantity
  }));

  // Validate the promotion code
  const validationResult = await exports.validatePromoCode(
    promotionCode,
    cartItems,
    customerId,
    order.merchant_id
  );

  if (!validationResult.valid) {
    throw new AppError(validationResult.message, 400);
  }

  const transaction = await db.sequelize.transaction();

  try {
    // Apply the discount to the order
    const updatedTotal = order.total_amount - validationResult.discount.amount;

    await order.update({
      total_amount: updatedTotal,
      applied_promotions: [
        ...(order.applied_promotions || []),
        {
          promotion_id: validationResult.promotion.id,
          code: validationResult.promotion.code,
          discount_amount: validationResult.discount.amount,
          applied_at: new Date()
        }
      ],
      total_discount: (order.total_discount || 0) + validationResult.discount.amount
    }, { transaction });

    // Record the promotion redemption
    await db.PromotionRedemption.create({
      promotion_id: validationResult.promotion.id,
      order_id: orderId,
      customer_id: customerId,
      discount_amount: validationResult.discount.amount,
      promotion_code: promotionCode,
      redeemed_at: new Date()
    }, { transaction });

    // Increment the usage count of the promotion
    await db.ProductPromotion.increment('usage_count', {
      where: { id: validationResult.promotion.id },
      transaction
    });

    await transaction.commit();

    logTransactionEvent({
      event: 'promotion_applied',
      user_id: customerId,
      merchant_id: order.merchant_id,
      data: {
        order_id: orderId,
        promotion_id: validationResult.promotion.id,
        promotion_code: promotionCode,
        discount_amount: validationResult.discount.amount
      }
    });

    // Return updated order
    return {
      order_id: order.id,
      order_number: order.order_number,
      original_total: order.total_amount + validationResult.discount.amount,
      discount_amount: validationResult.discount.amount,
      final_total: updatedTotal,
      promotion: {
        id: validationResult.promotion.id,
        name: validationResult.promotion.name,
        code: validationResult.promotion.code,
        type: validationResult.promotion.type
      },
      discount_details: validationResult.discount.details
    };
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};

module.exports = exports;