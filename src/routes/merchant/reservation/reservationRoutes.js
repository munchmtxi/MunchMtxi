'use strict';

const express = require('express');
const reservationController = require('@controllers/merchant/reservation/reservationController');
const reservationMiddleware = require('@middleware/reservationMiddleware');
const { logger } = require('@utils/logger');

const router = express.Router();

const ROLES = {
  ADMIN: 1,
  MERCHANT: 19,
  CUSTOMER: 2,
};

router.use((req, res, next) => {
  logger.info('Entering reservationRoutes root middleware', { path: req.path, method: req.method, skipCsrf: !!req.skipCsrf });
  next();
});

router.use(reservationMiddleware.authenticate, (req, res, next) => {
  logger.info('After authenticate middleware', { path: req.path, user: req.user?.id, role: req.user?.role_id, skipCsrf: !!req.skipCsrf });
  next();
});

router.get(
  '/branches/:branchId/bookings',
  reservationMiddleware.restrictToRoles(ROLES.MERCHANT, ROLES.ADMIN),
  reservationMiddleware.verifyBranchAccess,
  (req, res, next) => {
    logger.info('Route accessed: GET /branches/:branchId/bookings', { branchId: req.params.branchId, skipCsrf: !!req.skipCsrf });
    reservationController.getBookings(req, res, next);
  }
);

router.get(
  '/bookings/:bookingId',
  reservationMiddleware.verifyBookingAccess,
  (req, res, next) => {
    logger.info('Route accessed: GET /bookings/:bookingId', { bookingId: req.params.bookingId, skipCsrf: !!req.skipCsrf });
    reservationController.getBookingById(req, res, next);
  }
);

router.post(
  '/branches/:branchId/bookings',
  reservationMiddleware.restrictToRoles(ROLES.CUSTOMER),
  reservationMiddleware.verifyBranchAccess,
  reservationMiddleware.checkReservationEnabled,
  (req, res, next) => {
    logger.info('Route accessed: POST /branches/:branchId/bookings', { branchId: req.params.branchId, skipCsrf: !!req.skipCsrf });
    reservationController.createBooking(req, res, next);
  }
);

module.exports = router;