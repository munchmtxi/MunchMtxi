// src/controllers/paymentController.js
const paymentService = require('../services/paymentService');
const catchAsync = require('../utils/catchAsync');

class PaymentController {
  // Payment Initiation Controllers
  initiateMobileMoneyPayment = catchAsync(async (req, res) => {
    const payment = await paymentService.initiateMobileMoneyPayment(req.body);
    res.status(201).json({
      status: 'success',
      data: payment
    });
  });

  initiateBankCardPayment = catchAsync(async (req, res) => {
    const payment = await paymentService.initiateBankCardPayment(req.body);
    res.status(201).json({
      status: 'success',
      data: payment
    });
  });

  // Payment Status Controller
  getPaymentStatus = catchAsync(async (req, res) => {
    const payment = await paymentService.getPaymentStatus(req.params.paymentId);
    res.json({
      status: 'success',
      data: payment
    });
  });

  // Webhook Handler
  handleWebhook = catchAsync(async (req, res) => {
    const { provider } = req.params;
    const webhookData = req.body;
    
    await paymentService.handleWebhook(provider, webhookData);
    
    res.status(200).json({ status: 'success' });
  });
}

module.exports = new PaymentController();