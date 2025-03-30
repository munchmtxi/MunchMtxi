'use strict';

const catchAsync = require('@utils/catchAsync');
const subscriptionService = require('@services/customer/subscriptionService');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

const subscriptionController = {
  // Create a new subscription
  createSubscription: catchAsync(async (req, res, next) => {
    const customerId = req.user.id; // From JWT payload
    const { menu_item_id, schedule, start_date, end_date } = req.body;

    if (!menu_item_id || !schedule) {
      return next(new AppError('Menu item ID and schedule are required', 400, 'VALIDATION_ERROR'));
    }

    const subscription = await subscriptionService.createSubscription(customerId, {
      menu_item_id,
      schedule,
      start_date,
      end_date,
    });

    res.status(201).json({
      status: 'success',
      data: {
        subscription: {
          id: subscription.id,
          menu_item_id: subscription.menu_item_id,
          schedule: subscription.schedule,
          start_date: subscription.start_date,
          end_date: subscription.end_date,
          total_amount: subscription.total_amount,
          status: subscription.status,
        },
      },
    });
  }),

  // Update an existing subscription
  updateSubscription: catchAsync(async (req, res, next) => {
    const subscriptionId = req.params.id;
    const customerId = req.user.id;
    const { menu_item_id, schedule, start_date, end_date, status } = req.body;

    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription || subscription.customer_id !== customerId) {
      return next(new AppError('Subscription not found or not owned by user', 404, 'SUBSCRIPTION_NOT_FOUND'));
    }

    const updatedSubscription = await subscriptionService.updateSubscription(subscriptionId, {
      menu_item_id,
      schedule,
      start_date,
      end_date,
      status,
    });

    res.status(200).json({
      status: 'success',
      data: {
        subscription: {
          id: updatedSubscription.id,
          menu_item_id: updatedSubscription.menu_item_id,
          schedule: updatedSubscription.schedule,
          start_date: updatedSubscription.start_date,
          end_date: updatedSubscription.end_date,
          total_amount: updatedSubscription.total_amount,
          status: updatedSubscription.status,
        },
      },
    });
  }),

  // Cancel a subscription
  cancelSubscription: catchAsync(async (req, res, next) => {
    const subscriptionId = req.params.id;
    const customerId = req.user.id;
    const { reason } = req.body;

    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription || subscription.customer_id !== customerId) {
      return next(new AppError('Subscription not found or not owned by user', 404, 'SUBSCRIPTION_NOT_FOUND'));
    }

    const result = await subscriptionService.cancelSubscription(subscriptionId, reason || 'Customer request');

    res.status(200).json({
      status: 'success',
      data: result,
    });
  }),

  // Get all subscriptions for the authenticated customer
  getSubscriptions: catchAsync(async (req, res, next) => {
    const customerId = req.user.id;
    const subscriptions = await subscriptionService.getSubscriptions(customerId);

    res.status(200).json({
      status: 'success',
      results: subscriptions.length,
      data: { subscriptions },
    });
  }),
};

module.exports = subscriptionController;