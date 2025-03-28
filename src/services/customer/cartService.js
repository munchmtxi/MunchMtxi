'use strict';

const { Op } = require('sequelize');
const { Cart, CartItem, MenuInventory, ProductDiscount } = require('@models');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

/**
 * Cart Service - Handles shopping cart operations for customers
 */
class CartService {
  /**
   * Adds an item to the customer's cart
   * @param {number} customerId - The customer's ID
   * @param {number} menuItemId - The ID of the menu item to add
   * @param {number} quantity - Quantity to add
   * @param {Object} [customizations] - Customization options (e.g., { size: 'large', toppings: ['pepperoni'] })
   * @returns {Promise<Object>} Updated cart
   */
  static async addItemToCart(customerId, menuItemId, quantity, customizations = {}) {
    try {
      // Find or create the customer's cart
      let [cart, created] = await Cart.findOrCreate({
        where: { customer_id: customerId },
        defaults: { customer_id: customerId },
      });

      // Validate menu item
      const menuItem = await MenuInventory.findByPk(menuItemId, {
        include: [{ model: ProductDiscount, as: 'discounts' }],
      });
      if (!menuItem) {
        throw new AppError('Menu item not found', 404);
      }
      if (menuItem.availability_status !== 'in-stock' || (menuItem.quantity && menuItem.quantity < quantity)) {
        throw new AppError('Item is not available or insufficient stock', 400);
      }

      // Check if item already exists in cart
      let cartItem = await CartItem.findOne({
        where: { cart_id: cart.id, menu_item_id: menuItemId, customizations },
      });

      if (cartItem) {
        // Update quantity if item exists
        cartItem.quantity += quantity;
        await cartItem.save();
      } else {
        // Add new item to cart
        cartItem = await CartItem.create({
          cart_id: cart.id,
          menu_item_id: menuItemId,
          quantity,
          customizations,
          unit_price: menuItem.calculateFinalPrice(),
        });
      }

      logger.info('Item added to cart', { customerId, menuItemId, quantity });
      return await this.getCart(customerId);
    } catch (error) {
      logger.error('Error adding item to cart', { error: error.message });
      throw error instanceof AppError ? error : new AppError('Failed to add item to cart', 500);
    }
  }

  /**
   * Removes an item from the customer's cart
   * @param {number} customerId - The customer's ID
   * @param {number} cartItemId - The ID of the cart item to remove
   * @param {boolean} [saveForLater=false] - Whether to save the item for later
   * @returns {Promise<Object>} Updated cart
   */
  static async removeItemFromCart(customerId, cartItemId, saveForLater = false) {
    try {
      const cart = await Cart.findOne({ where: { customer_id: customerId } });
      if (!cart) {
        throw new AppError('Cart not found', 404);
      }

      const cartItem = await CartItem.findByPk(cartItemId);
      if (!cartItem || cartItem.cart_id !== cart.id) {
        throw new AppError('Cart item not found or does not belong to your cart', 404);
      }

      if (saveForLater) {
        cartItem.saved_for_later = true;
        await cartItem.save();
      } else {
        await cartItem.destroy();
      }

      logger.info('Item removed from cart', { customerId, cartItemId, saveForLater });
      return await this.getCart(customerId);
    } catch (error) {
      logger.error('Error removing item from cart', { error: error.message });
      throw error instanceof AppError ? error : new AppError('Failed to remove item from cart', 500);
    }
  }

  /**
   * Updates a cart item's quantity or customizations
   * @param {number} customerId - The customer's ID
   * @param {number} cartItemId - The ID of the cart item to update
   * @param {Object} updates - Updates (e.g., { quantity: 2, customizations: { size: 'medium' } })
   * @returns {Promise<Object>} Updated cart
   */
  static async updateCartItem(customerId, cartItemId, updates) {
    try {
      const cart = await Cart.findOne({ where: { customer_id: customerId } });
      if (!cart) {
        throw new AppError('Cart not found', 404);
      }

      const cartItem = await CartItem.findByPk(cartItemId, {
        include: [{ model: MenuInventory, as: 'menuItem' }],
      });
      if (!cartItem || cartItem.cart_id !== cart.id) {
        throw new AppError('Cart item not found or does not belong to your cart', 404);
      }

      if (updates.quantity !== undefined) {
        if (updates.quantity <= 0) {
          throw new AppError('Quantity must be greater than 0', 400);
        }
        if (cartItem.menuItem.quantity && cartItem.menuItem.quantity < updates.quantity) {
          throw new AppError('Insufficient stock for updated quantity', 400);
        }
        cartItem.quantity = updates.quantity;
      }

      if (updates.customizations !== undefined) {
        cartItem.customizations = updates.customizations;
        cartItem.unit_price = cartItem.menuItem.calculateFinalPrice(); // Recalculate price if customizations affect it
      }

      await cartItem.save();
      logger.info('Cart item updated', { customerId, cartItemId, updates });
      return await this.getCart(customerId);
    } catch (error) {
      logger.error('Error updating cart item', { error: error.message });
      throw error instanceof AppError ? error : new AppError('Failed to update cart item', 500);
    }
  }

  /**
   * Retrieves the customer's cart with detailed contents
   * @param {number} customerId - The customer's ID
   * @param {string} [couponCode] - Optional coupon code to apply
   * @returns {Promise<Object>} Cart details
   */
  static async getCart(customerId, couponCode = null) {
    try {
      const cart = await Cart.findOne({
        where: { customer_id: customerId },
        include: [
          {
            model: CartItem,
            as: 'items',
            where: { saved_for_later: false },
            include: [
              {
                model: MenuInventory,
                as: 'menuItem',
                include: [{ model: ProductDiscount, as: 'discounts' }],
              },
            ],
          },
        ],
      });

      if (!cart) {
        logger.info('No cart found, returning empty cart', { customerId });
        return { id: null, items: [], subtotal: 0, total: 0, tax: 0, delivery_fee: 0 };
      }

      // Calculate subtotal
      const subtotal = cart.items.reduce((sum, item) => {
        return sum + item.unit_price * item.quantity;
      }, 0);

      // Apply coupon if provided
      let discount = 0;
      if (couponCode) {
        const coupon = await ProductDiscount.findOne({
          where: {
            coupon_code: couponCode,
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
        });
        if (coupon) {
          if (coupon.type === 'percentage') {
            discount = subtotal * (coupon.value / 100);
          } else if (coupon.type === 'flat') {
            discount = Math.min(coupon.value, subtotal);
          }
        }
      }

      // Placeholder for tax and delivery fee (customize as needed)
      const tax = subtotal * 0.1; // 10% tax example
      const delivery_fee = 5.0; // Flat $5 delivery fee example

      const total = Math.max(subtotal - discount + tax + delivery_fee, 0);

      logger.info('Cart retrieved', { customerId, itemCount: cart.items.length, total });
      return {
        id: cart.id,
        items: cart.items.map(item => ({
          id: item.id,
          menu_item_id: item.menu_item_id,
          name: item.menuItem.name,
          quantity: item.quantity,
          customizations: item.customizations,
          unit_price: item.unit_price,
          subtotal: item.unit_price * item.quantity,
        })),
        subtotal,
        discount,
        tax,
        delivery_fee,
        total,
      };
    } catch (error) {
      logger.error('Error retrieving cart', { error: error.message });
      throw error instanceof AppError ? error : new AppError('Failed to retrieve cart', 500);
    }
  }

  /**
   * Clears the customer's cart
   * @param {number} customerId - The customer's ID
   * @returns {Promise<void>}
   */
  static async clearCart(customerId) {
    try {
      const cart = await Cart.findOne({ where: { customer_id: customerId } });
      if (cart) {
        await CartItem.destroy({ where: { cart_id: cart.id } });
        await cart.destroy();
        logger.info('Cart cleared', { customerId });
      }
    } catch (error) {
      logger.error('Error clearing cart', { error: error.message });
      throw new AppError('Failed to clear cart', 500);
    }
  }
}

module.exports = CartService;