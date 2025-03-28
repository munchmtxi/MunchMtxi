'use strict';

const { body, param, query, validationResult } = require('express-validator');
const { Customer, Cart, CartItem } = require('@models');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const { protect } = require('@middleware/authMiddleware');

/**
 * Cart Middleware - Validates and authorizes cart-related requests
 */
const cartMiddleware = {
  /**
   * Ensures the user is authenticated and attaches customerId
   */
  authenticateCustomer: [
    protect, // Use existing protect middleware for JWT validation
    async (req, res, next) => {
      try {
        const customer = await Customer.findOne({ where: { user_id: req.user.id } });
        if (!customer) {
          logger.warn('No customer profile found for authenticated user', { userId: req.user.id });
          return next(new AppError('Customer profile not found', 404));
        }
        req.user.customerId = customer.id;
        next();
      } catch (error) {
        logger.error('Error in authenticateCustomer middleware', { error: error.message });
        next(new AppError('Authentication failed', 500));
      }
    },
  ],

  /**
   * Validates input for adding an item to the cart
   */
  validateAddItem: [
    body('menuItemId').isInt({ min: 1 }).withMessage('Menu item ID must be a positive integer'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('customizations').optional().isObject().withMessage('Customizations must be an object'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for addItem', { errors: errors.array() });
        return next(new AppError('Validation failed', 400, null, errors.array()));
      }
      next();
    },
  ],

  /**
   * Validates input for removing an item from the cart
   */
  validateRemoveItem: [
    param('cartItemId').isInt({ min: 1 }).withMessage('Cart item ID must be a positive integer'),
    body('saveForLater').optional().isBoolean().withMessage('Save for later must be a boolean'),
    async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for removeItem', { errors: errors.array() });
        return next(new AppError('Validation failed', 400, null, errors.array()));
      }

      // Verify cart item ownership
      const cartItem = await CartItem.findByPk(req.params.cartItemId);
      if (!cartItem) {
        return next(new AppError('Cart item not found', 404));
      }
      const cart = await Cart.findByPk(cartItem.cart_id);
      if (cart.customer_id !== req.user.customerId) {
        logger.warn('Cart item ownership check failed', { customerId: req.user.customerId, cartItemId: req.params.cartItemId });
        return next(new AppError('You do not own this cart item', 403));
      }
      next();
    },
  ],

  /**
   * Validates input for updating a cart item
   */
  validateUpdateItem: [
    param('cartItemId').isInt({ min: 1 }).withMessage('Cart item ID must be a positive integer'),
    body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('customizations').optional().isObject().withMessage('Customizations must be an object'),
    async (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for updateItem', { errors: errors.array() });
        return next(new AppError('Validation failed', 400, null, errors.array()));
      }

      // Verify cart item ownership
      const cartItem = await CartItem.findByPk(req.params.cartItemId);
      if (!cartItem) {
        return next(new AppError('Cart item not found', 404));
      }
      const cart = await Cart.findByPk(cartItem.cart_id);
      if (cart.customer_id !== req.user.customerId) {
        logger.warn('Cart item ownership check failed', { customerId: req.user.customerId, cartItemId: req.params.cartItemId });
        return next(new AppError('You do not own this cart item', 403));
      }
      next();
    },
  ],

  /**
   * Validates input for viewing the cart
   */
  validateViewCart: [
    query('couponCode').optional().isString().withMessage('Coupon code must be a string'),
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.warn('Validation failed for viewCart', { errors: errors.array() });
        return next(new AppError('Validation failed', 400, null, errors.array()));
      }
      next();
    },
  ],

  /**
   * No additional validation needed for clearCart beyond authentication
   */
  validateClearCart: [],
};

module.exports = cartMiddleware;