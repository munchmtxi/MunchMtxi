'use strict';

const reservationBookingService = require('@services/merchant/reservation/reservationBookingService');
const catchAsync = require('@utils/catchAsync'); // Changed from destructuring
const AppError = require('@utils/AppError');
const { logger } = require('@utils/logger');

/**
 * Controller for managing reservation bookings.
 */
class ReservationController {
    getBookings = catchAsync(async (req, res, next) => {
      const { branchId } = req.params;
      const filters = {
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        date: req.query.date,
        status: req.query.status,
        search: req.query.search,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset, 10) : undefined,
      };
  
      // Ensure limit and offset are valid numbers or undefined
      if (filters.limit !== undefined && isNaN(filters.limit)) {
        filters.limit = undefined;
      }
      if (filters.offset !== undefined && isNaN(filters.offset)) {
        filters.offset = undefined;
      }
  
      logger.info('Fetching bookings for branch', { branchId, filters });
  
      const bookings = await reservationBookingService.getBookings(branchId, filters);
  
      res.status(200).json({
        status: 'success',
        results: bookings.length,
        data: { bookings },
      });
    });

  /**
   * Get a single booking by ID.
   * @route GET /api/merchant/bookings/:bookingId
   */
  getBookingById = catchAsync(async (req, res, next) => {
    const { bookingId } = req.params;

    logger.info('Fetching booking by ID', { bookingId });

    const booking = await reservationBookingService.getBookingById(bookingId);

    res.status(200).json({
      status: 'success',
      data: { booking },
    });
  });

  /**
   * Create a new booking.
   * @route POST /api/merchant/branches/:branchId/bookings
   */
  createBooking = catchAsync(async (req, res, next) => {
    const { branchId } = req.params;
    const bookingData = {
      customer_id: req.user.id, // Assuming authenticated user is the customer
      merchant_id: req.user.merchantId, // Assuming this is available from auth
      branch_id: branchId,
      booking_date: req.body.booking_date,
      booking_time: req.body.booking_time,
      guest_count: req.body.guest_count,
      special_requests: req.body.special_requests,
      seating_preference: req.body.seating_preference,
      occasion: req.body.occasion,
      source: req.body.source,
      customer_location: req.body.customer_location,
    };

    // Basic validation
    if (!bookingData.booking_date || !bookingData.booking_time || !bookingData.guest_count) {
      return next(new AppError('Booking date, time, and guest count are required', 400));
    }

    logger.info('Creating new booking', { branchId, customerId: req.user.id });

    const newBooking = await reservationBookingService.createBooking(bookingData);

    res.status(201).json({
      status: 'success',
      data: { booking: newBooking },
    });
  });
}

module.exports = new ReservationController();