'use strict';

const express = require('express');
const router = express.Router();
const subscriptionController = require('@controllers/customer/subscriptionController');
const {
  authenticateSubscription,
  restrictToCustomer,
  checkSubscriptionOwnership,
  validateSubscriptionCreation,
  validateSubscriptionUpdate,
  validateSubscriptionCancel,
} = require('@middleware/customer/subscriptionMiddleware');

// Subscription routes
router
  .route('/')
  .post(
    authenticateSubscription,
    restrictToCustomer,
    validateSubscriptionCreation,
    subscriptionController.createSubscription
  )
  .get(
    authenticateSubscription,
    restrictToCustomer,
    subscriptionController.getSubscriptions
  );

router
  .route('/:id')
  .patch(
    authenticateSubscription,
    restrictToCustomer,
    checkSubscriptionOwnership,
    validateSubscriptionUpdate,
    subscriptionController.updateSubscription
  )
  .delete(
    authenticateSubscription,
    restrictToCustomer,
    checkSubscriptionOwnership,
    validateSubscriptionCancel,
    subscriptionController.cancelSubscription
  );

module.exports = router;