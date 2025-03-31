'use strict';

const express = require('express');
const router = express.Router();
const quickLinkController = require('@controllers/customer/quickLinkController');
const quickLinkMiddleware = require('@middleware/customer/quickLinkMiddleware');

// Middleware to authenticate and restrict to customers
const authMiddleware = [
  quickLinkMiddleware.authenticateCustomer,
  quickLinkMiddleware.restrictToCustomers,
];

// Routes for Quick Link Management
router.post(
  '/check-in',
  authMiddleware,
  quickLinkMiddleware.validateBody(['user_id', 'booking_id']),
  quickLinkController.checkIn
);

router.post(
  '/call-staff',
  authMiddleware,
  quickLinkMiddleware.validateBody(['user_id', 'table_id', 'request_type']),
  quickLinkController.callStaff
);

router.post(
  '/request-bill',
  authMiddleware,
  quickLinkMiddleware.validateBody(['user_id', 'in_dining_order_id', 'payment_method']),
  quickLinkController.requestBill
);

module.exports = router;