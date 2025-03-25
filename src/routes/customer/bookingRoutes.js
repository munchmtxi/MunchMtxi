'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('@controllers/customer/bookingController');
const bookingAuthMiddleware = require('@middleware/customer/bookingAuthMiddleware');
const catchAsync = require('@utils/catchAsync');

router.post(
  '/reserve',
  bookingAuthMiddleware('customer'),
  catchAsync(bookingController.reserveTable)
);

router.put(
  '/:bookingId/approve-deny',
  bookingAuthMiddleware('merchant'),
  catchAsync(bookingController.approveOrDenyBooking)
);

router.put(
  '/:bookingId/check-in',
  bookingAuthMiddleware('merchant'),
  catchAsync(bookingController.checkInBooking)
);

router.delete(
  '/:bookingId',
  bookingAuthMiddleware('any'),
  catchAsync(bookingController.cancelBooking)
);

router.get(
  '/available',
  catchAsync(bookingController.getAvailableTables)
);

module.exports = router;