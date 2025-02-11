// src/routes/paymentRoutes.js
const express = require('express');
const router = express.Router();

// Import all dependencies with correct paths
const { authenticate, authorizeRoles } = require('../middleware/authMiddleware'); // Fixed path
const {
  mobileMoneySchema,
  bankCardSchema,
  webhookSchema,
  validatePayment
} = require('../validators/paymentValidators');
const PaymentService = require('../services/paymentService');
const catchAsync = require('../utils/catchAsync');

// Debug imports
console.log('Checking dependencies:', {
  authenticate: typeof authenticate,
  validatePayment: typeof validatePayment,
  PaymentService: typeof PaymentService,
  catchAsync: typeof catchAsync
});

// Define routes with authentication and authorization
router.post('/mobile-money/initiate', 
  authenticate,
  authorizeRoles('customer', 'merchant'), // Add appropriate roles
  validatePayment(mobileMoneySchema),
  catchAsync(async (req, res) => {
    const payment = await PaymentService.initiateMobileMoneyPayment(req.body);
    res.status(201).json({
      status: 'success',
      data: payment
    });
  })
);

router.post('/bank-card/initiate',
  authenticate,
  authorizeRoles('customer', 'merchant'), // Add appropriate roles
  validatePayment(bankCardSchema),
  catchAsync(async (req, res) => {
    const payment = await PaymentService.initiateBankCardPayment(req.body);
    res.status(201).json({
      status: 'success',
      data: payment
    });
  })
);

router.get('/:paymentId/status',
  authenticate,
  catchAsync(async (req, res) => {
    const payment = await PaymentService.getPaymentStatus(req.params.paymentId);
    res.json({
      status: 'success',
      data: payment
    });
  })
);

// Webhook route without authentication
router.post('/webhook/:provider',
  validatePayment(webhookSchema),
  catchAsync(async (req, res) => {
    const { provider } = req.params;
    await PaymentService.handleWebhook(provider, req.body);
    res.status(200).json({ 
      status: 'success' 
    });
  })
);

module.exports = router;