'use strict';

const bookingService = require('@services/customer/bookingService');
const catchAsync = require('@utils/catchAsync');
const { logger, logApiEvent } = require('@utils/logger');

const bookingController = {
  /**
   * Handles table reservation requests.
   */
  reserveTable: catchAsync(async (req, res) => {
    const { merchantId, branchId, tableId, bookingDate, bookingTime, guestCount } = req.body;
    const customerId = req.user.id; // Assumes bookingAuthMiddleware sets req.user

    const booking = await bookingService.reserveTable({
      customerId,
      merchantId,
      branchId,
      tableId,
      bookingDate,
      bookingTime,
      guestCount,
    });

    logApiEvent('Table reservation request processed', {
      bookingId: booking.id,
      customerId,
      tableId,
    });

    res.status(201).json({
      success: true,
      data: {
        id: booking.id,
        tableId: booking.table_id,
        bookingDate: booking.booking_date,
        bookingTime: booking.booking_time,
        guestCount: booking.guest_count,
        status: booking.status,
        waitlistPosition: booking.waitlist_position || null,
      },
    });
  }),

  /**
   * Handles approval or denial of a booking by a merchant.
   */
  approveOrDenyBooking: catchAsync(async (req, res) => {
    const { bookingId } = req.params;
    const { action, reason } = req.body;
    const merchantId = req.user.id; // Assumes bookingAuthMiddleware sets req.user

    if (!['approve', 'deny'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid action. Must be "approve" or "deny"',
      });
    }

    const booking = await bookingService.approveOrDenyBooking({
      bookingId,
      merchantId,
      action,
      reason,
    });

    logApiEvent(`Booking ${action}ed by merchant`, {
      bookingId,
      merchantId,
      action,
    });

    res.status(200).json({
      success: true,
      data: {
        id: booking.id,
        status: booking.status,
        approvalReason: booking.approval_reason || null,
      },
    });
  }),

  /**
   * Handles customer check-in for a booking.
   */
  checkInBooking: catchAsync(async (req, res) => {
    const { bookingId } = req.params;
    const merchantId = req.user.id; // Assumes bookingAuthMiddleware sets req.user

    const booking = await bookingService.checkInBooking({
      bookingId,
      merchantId,
    });

    logApiEvent('Customer checked in for booking', {
      bookingId,
      merchantId,
    });

    res.status(200).json({
      success: true,
      data: {
        id: booking.id,
        status: booking.status,
        seatedAt: booking.seated_at,
        digitalMenuUrl: booking.booking_metadata?.digital_menu_url || null,
      },
    });
  }),

  /**
   * Handles cancellation of a booking by customer or merchant.
   */
  cancelBooking: catchAsync(async (req, res) => {
    const { bookingId } = req.params;
    const userId = req.user.id; // Assumes bookingAuthMiddleware sets req.user
    const isMerchant = req.user.role === 'merchant';

    const booking = await bookingService.cancelBooking({
      bookingId,
      userId,
      isMerchant,
    });

    logApiEvent('Booking cancelled', {
      bookingId,
      userId,
      isMerchant,
      cancellationFee: booking.booking_metadata?.cancellation_fee || 0,
    });

    res.status(200).json({
      success: true,
      data: {
        id: booking.id,
        status: booking.status,
        cancellationFee: booking.booking_metadata?.cancellation_fee || 0,
        cancelledBy: booking.booking_metadata?.cancelled_by || null,
      },
    });
  }),

  /**
   * Retrieves available tables for a given branch, date, and time.
   */
  getAvailableTables: catchAsync(async (req, res) => {
    const { branchId, bookingDate, bookingTime } = req.query;

    const tables = await bookingService.getAvailableTables({
      branchId,
      bookingDate,
      bookingTime,
    });

    logApiEvent('Available tables retrieved', {
      branchId,
      tableCount: tables.length,
    });

    res.status(200).json({
      success: true,
      data: tables.map(table => ({
        id: table.id,
        tableNumber: table.table_number,
        capacity: table.capacity,
        locationType: table.location_type,
      })),
    });
  }),
};

module.exports = bookingController;