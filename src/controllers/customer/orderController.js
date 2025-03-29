// src/controllers/customer/orderController.js
const OrderService = require('@services/customer/orderService');
const catchAsync = require('@utils/catchAsync');
const AppError = require('@utils/AppError');

const orderController = {
  checkout: catchAsync(async (req, res, next) => {
    const { customer_id, payment_method, cart_id } = req.body;
    if (!customer_id || !payment_method || !cart_id) {
      throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR');
    }

    const result = await OrderService.checkout({ customer_id, payment_method, cart_id });
    res.status(201).json({
      status: 'success',
      data: result,
    });
  }),

  notifyMerchant: catchAsync(async (req, res, next) => {
    const { order_id } = req.body;
    if (!order_id) throw new AppError('Order ID is required', 400, 'VALIDATION_ERROR');

    const result = await OrderService.notifyMerchant(order_id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  confirmOrderReady: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await OrderService.confirmOrderReady(id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  assignDriver: catchAsync(async (req, res, next) => {
    const { order_id } = req.body;
    if (!order_id) throw new AppError('Order ID is required', 400, 'VALIDATION_ERROR');

    const result = await OrderService.assignDriver(order_id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  confirmPickup: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await OrderService.confirmPickup(id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  confirmDelivery: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await OrderService.confirmDelivery(id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  requestFeedback: catchAsync(async (req, res, next) => {
    const { order_id } = req.body;
    if (!order_id) throw new AppError('Order ID is required', 400, 'VALIDATION_ERROR');

    const result = await OrderService.requestFeedback(order_id);
    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  getOrderStatus: catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const order = await OrderService.getOrderStatus(id);
    res.status(200).json({
      status: 'success',
      data: order,
    });
  }),
};

module.exports = orderController;