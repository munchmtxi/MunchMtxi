'use strict';

const express = require('express');
const cartController = require('@controllers/customer/cartController');
const cartMiddleware = require('@middleware/customer/cartMiddleware');

const router = express.Router();

/**
 * Cart Routes - Defines endpoints for shopping cart management
 * All routes require customer authentication
 */
router.use(cartMiddleware.authenticateCustomer);

// Add item to cart
router.post(
  '/items',
  cartMiddleware.validateAddItem,
  cartController.addItem
);

// Remove item from cart
router.delete(
  '/items/:cartItemId',
  cartMiddleware.validateRemoveItem,
  cartController.removeItem
);

// Update cart item
router.patch(
  '/items/:cartItemId',
  cartMiddleware.validateUpdateItem,
  cartController.updateItem
);

// View cart
router.get(
  '/',
  cartMiddleware.validateViewCart,
  cartController.viewCart
);

// Clear cart
router.delete(
  '/',
  cartMiddleware.validateClearCart,
  cartController.clearCart
);

module.exports = router;