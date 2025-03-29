// src/routes/customer/orderRoutes.js
const express = require('express');
const orderController = require('@controllers/customer/orderController');
const { restrictToCustomer, restrictToMerchant, restrictToDriver } = require('@middleware/customer/orderAuthMiddleware');

const router = express.Router();

// 1. Checkout (Customer Action)
router.post('/checkout', restrictToCustomer, orderController.checkout);

// 2. Notify Merchant (Triggered automatically or manually, merchant access)
router.post('/order/notify-merchant', restrictToMerchant, orderController.notifyMerchant);

// 3. Confirm Order Ready (Merchant Action)
router.put('/order/:id/status', restrictToMerchant, orderController.confirmOrderReady);

// 4. Assign Driver (Could be automated, but allowing manual for flexibility)
router.post('/order/assign-driver', restrictToDriver, orderController.assignDriver);

// 5. Confirm Pickup (Driver Action)
router.put('/order/:id/pickup', restrictToDriver, orderController.confirmPickup);

// 6. Confirm Delivery (Driver Action)
router.put('/order/:id/deliver', restrictToDriver, orderController.confirmDelivery);

// 7. Request Feedback (Customer or automated, but accessible to customer)
router.post('/order/request-feedback', restrictToCustomer, orderController.requestFeedback);

// 8. Get Order Status (Customer Action)
router.get('/order/:id/status', restrictToCustomer, orderController.getOrderStatus);

module.exports = router;