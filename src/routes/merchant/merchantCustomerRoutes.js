'use strict';

const express = require('express');
const router = express.Router({ mergeParams: true }); // Ensure params from parent route are inherited
const {
  validateToken,
  validateMerchantOwnership,
  validateStaffAssignment,
  validateBranch,
  hasMerchantPermission,
} = require('@middleware/merchant/merchantCustomerMiddleware');
const { logger } = require('@utils/logger');

module.exports = (io) => {
  const merchantCustomerController = require('@controllers/merchant/merchantCustomerController')(io);

  router.get(
    '/bookings', // No need for :merchantId here since it's in the parent route
    validateToken,
    validateMerchantOwnership,
    hasMerchantPermission('view_bookings'),
    (req, res, next) => {
      logger.info('Route: /bookings', { params: req.params, merchant: req.merchant });
      merchantCustomerController.getBookings(req, res, next);
    }
  );

  // Other routes...
  router.post('/bookings/assign-staff', validateToken, validateMerchantOwnership, validateStaffAssignment, merchantCustomerController.assignStaffToBooking);
  router.post('/tables/assign-staff', validateToken, validateMerchantOwnership, validateStaffAssignment, merchantCustomerController.assignStaffToTable);
  router.put('/in-dining-orders/:orderId', validateToken, validateMerchantOwnership, validateStaffAssignment, merchantCustomerController.manageInDiningOrder);
  router.get('/staff/:staffId/feedback', validateToken, validateMerchantOwnership, merchantCustomerController.getStaffFeedback);
  router.put('/takeaway-orders/:orderId', validateToken, validateMerchantOwnership, validateStaffAssignment, merchantCustomerController.manageTakeawayOrder);
  router.post('/subscription-orders/fulfill', validateToken, validateMerchantOwnership, validateStaffAssignment, merchantCustomerController.fulfillSubscriptionOrder);
  router.post('/branches/:branchId/distance', validateToken, validateMerchantOwnership, validateBranch, merchantCustomerController.calculateBranchDistance);
  router.get('/performance-report', validateToken, validateMerchantOwnership, hasMerchantPermission('view_reports'), merchantCustomerController.generatePerformanceReport);

  return router;
};