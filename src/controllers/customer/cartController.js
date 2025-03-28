'use strict';

const CartService = require('@services/customer/cartService');
const { logger } = require('@utils/logger');
const catchAsync = require('@utils/catchAsync');

/**
 * Cart Controller - Handles HTTP requests for shopping cart management
 */
const cartController = {
  /**
   * Adds an item to the cart
   */
  addItem: catchAsync(async (req, res) => {
    const { menuItemId, quantity, customizations } = req.body;
    const customerId = req.user.customerId; // Set by middleware

    const cart = await CartService.addItemToCart(customerId, menuItemId, quantity, customizations);
    logger.info('Item added to cart via controller', { customerId, menuItemId });

    res.status(200).json({
      status: 'success',
      data: cart,
    });
  }),

  /**
   * Removes an item from the cart
   */
  removeItem: catchAsync(async (req, res) => {
    const { cartItemId } = req.params;
    const { saveForLater = false } = req.body;
    const customerId = req.user.customerId;

    const cart = await CartService.removeItemFromCart(customerId, parseInt(cartItemId), saveForLater);
    logger.info('Item removed from cart via controller', { customerId, cartItemId });

    res.status(200).json({
      status: 'success',
      data: cart,
    });
  }),

  /**
   * Updates a cart item
   */
  updateItem: catchAsync(async (req, res) => {
    const { cartItemId } = req.params;
    const { quantity, customizations } = req.body;
    const customerId = req.user.customerId;

    const updates = {};
    if (quantity !== undefined) updates.quantity = quantity;
    if (customizations !== undefined) updates.customizations = customizations;

    const cart = await CartService.updateCartItem(customerId, parseInt(cartItemId), updates);
    logger.info('Cart item updated via controller', { customerId, cartItemId });

    res.status(200).json({
      status: 'success',
      data: cart,
    });
  }),

  /**
   * Views the cart contents
   */
  viewCart: catchAsync(async (req, res) => {
    const { couponCode } = req.query;
    const customerId = req.user.customerId;

    const cart = await CartService.getCart(customerId, couponCode);
    logger.info('Cart viewed via controller', { customerId });

    res.status(200).json({
      status: 'success',
      data: cart,
    });
  }),

  /**
   * Clears the cart
   */
  clearCart: catchAsync(async (req, res) => {
    const customerId = req.user.customerId;

    await CartService.clearCart(customerId);
    logger.info('Cart cleared via controller', { customerId });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  }),
};

module.exports = cartController;