'use strict';

const express = require('express');
const MenuController = require('@controllers/customer/menuController');
const menuMiddleware = require('@middleware/customer/menuMiddleware');

const router = express.Router();

/**
 * Customer Menu Routes - Handles menu-related requests
 */
router.get(
  '/menu',
  menuMiddleware.authenticateCustomer,
  menuMiddleware.validateMenuQuery,
  MenuController.getMenuItems
);

module.exports = router;