'use strict';

const express = require('express');
const router = express.Router();
const StaffController = require('@controllers/staff/staffController');
const { authenticateStaff, restrictToActiveStaff, isAssignedToResource } = require('@middleware/staff/staffManagementMiddleware');

router.use(authenticateStaff); // All routes require staff authentication

router.get('/bookings', restrictToActiveStaff, StaffController.getBookings);
router.post('/booking-notification', restrictToActiveStaff, isAssignedToResource('booking'), StaffController.handleBookingNotification);
router.post('/order-notification', restrictToActiveStaff, isAssignedToResource('order'), StaffController.handleOrderNotification);
router.post('/quick-link-request', restrictToActiveStaff, isAssignedToResource('notification'), StaffController.handleQuickLinkRequest);
router.post('/subscription-notification', restrictToActiveStaff, isAssignedToResource('subscription'), StaffController.handleSubscriptionNotification);
router.post('/payment-notification', restrictToActiveStaff, isAssignedToResource('payment'), StaffController.handlePaymentNotification);

module.exports = router;