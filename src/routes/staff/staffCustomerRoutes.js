'use strict';

const express = require('express');
const StaffCustomerController = require('@controllers/staff/staffCustomerController');
const staffCustomerMiddleware = require('@middleware/staff/staffCustomerMiddleware');

const router = express.Router();

module.exports = (io, whatsappService, emailService, smsService) => {
  const controller = new StaffCustomerController(io, whatsappService, emailService, smsService);

  router.post(
    '/check-in/:bookingId',
    staffCustomerMiddleware.authenticateStaff,
    staffCustomerMiddleware.validateCheckIn,
    controller.checkIn.bind(controller)
  );

  router.post(
    '/assistance',
    staffCustomerMiddleware.authenticateStaff,
    controller.requestAssistance.bind(controller)
  );

  router.post(
    '/bill/:orderId',
    staffCustomerMiddleware.authenticateStaff,
    staffCustomerMiddleware.validateBillRequest,
    controller.processBill.bind(controller)
  );

  return router;
};