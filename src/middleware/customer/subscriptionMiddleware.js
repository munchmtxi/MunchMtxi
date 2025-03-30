'use strict';

const passport = require('passport');
const { validateRequest } = require('@middleware/validateRequest');
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');
const Joi = require('joi');
const { Subscription } = require('@models');

// Authentication middleware using Passport JWT
const authenticateSubscription = passport.authenticate('jwt', { session: false });

// Authorization middleware to ensure customer role
const restrictToCustomer = (req, res, next) => {
  if (!req.user || req.user.roleId !== 2) { // Role ID 2 = 'customer' from your roles table
    logger.warn('Non-customer attempted subscription access', { userId: req.user?.id, roleId: req.user?.roleId });
    return next(new AppError('This endpoint is restricted to customers only', 403, 'UNAUTHORIZED_ROLE'));
  }
  next();
};

// Validate subscription ownership
const checkSubscriptionOwnership = async (req, res, next) => {
  const subscriptionId = req.params.id;
  const customerId = req.user.id;

  try {
    const subscription = await Subscription.findByPk(subscriptionId);
    if (!subscription || subscription.customer_id !== customerId) {
      logger.warn('Subscription ownership check failed', { subscriptionId, customerId });
      return next(new AppError('Subscription not found or not owned by you', 404, 'SUBSCRIPTION_NOT_FOUND'));
    }
    req.subscription = subscription; // Attach subscription to request for later use
    next();
  } catch (error) {
    logger.error('Error checking subscription ownership', { error });
    return next(new AppError('Error verifying subscription ownership', 500, 'SERVER_ERROR'));
  }
};

// Joi schemas for request validation
const subscriptionSchema = Joi.object({
  menu_item_id: Joi.number().integer().required().messages({
    'number.base': 'Menu item ID must be a number',
    'any.required': 'Menu item ID is required',
  }),
  schedule: Joi.string().valid('daily', 'weekly', 'monthly').required().messages({
    'string.base': 'Schedule must be a string',
    'any.only': 'Schedule must be one of: daily, weekly, monthly',
    'any.required': 'Schedule is required',
  }),
  start_date: Joi.date().iso().optional().messages({
    'date.base': 'Start date must be a valid ISO date',
  }),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional().allow(null).messages({
    'date.base': 'End date must be a valid ISO date',
    'date.greater': 'End date must be after start date',
  }),
});

const updateSubscriptionSchema = Joi.object({
  menu_item_id: Joi.number().integer().optional(),
  schedule: Joi.string().valid('daily', 'weekly', 'monthly').optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().greater(Joi.ref('start_date')).optional().allow(null),
  status: Joi.string().valid('active', 'paused', 'canceled').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

const cancelSubscriptionSchema = Joi.object({
  reason: Joi.string().optional().allow(''),
});

// Middleware to validate subscription creation
const validateSubscriptionCreation = validateRequest(subscriptionSchema);

// Middleware to validate subscription update
const validateSubscriptionUpdate = validateRequest(updateSubscriptionSchema);

// Middleware to validate subscription cancellation
const validateSubscriptionCancel = validateRequest(cancelSubscriptionSchema);

module.exports = {
  authenticateSubscription,
  restrictToCustomer,
  checkSubscriptionOwnership,
  validateSubscriptionCreation,
  validateSubscriptionUpdate,
  validateSubscriptionCancel,
};