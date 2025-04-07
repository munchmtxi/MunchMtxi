'use strict';

/**
 * Socket.IO events for staff profile and management-related actions
 */
const STAFF_EVENTS = {
  // Namespace for staff-related events
  STAFF: {
    // Booking-related events
    BOOKING_NOTIFICATION: 'staff:booking_notification',
    BOOKING_ASSIGNED: 'staff:booking_assigned',
    BOOKING_UPDATE: 'staff:booking_update',

    // Order-related events
    ORDER_NOTIFICATION: 'staff:order_notification',
    ORDER_ASSIGNED: 'staff:order_assigned',
    ORDER_UPDATE: 'staff:order_update',

    // Quick link request events
    QUICK_LINK_REQUEST: 'staff:quick_link_request',
    QUICK_LINK_ASSIGNED: 'staff:quick_link_assigned',
    QUICK_LINK_RESOLVED: 'staff:quick_link_resolved',

    // Subscription-related events
    SUBSCRIPTION_NOTIFICATION: 'staff:subscription_notification',
    SUBSCRIPTION_ORDER_ASSIGNED: 'staff:subscription_order_assigned',
    SUBSCRIPTION_UPDATE: 'staff:subscription_update',

    // Payment-related events
    PAYMENT_NOTIFICATION: 'staff:payment_notification',
    PAYMENT_UPDATE: 'staff:payment_update',

    // General success and error responses
    SUCCESS: 'staff:success',
    ERROR: 'staff:error',

    // Staff profile-specific events
    PROFILE_UPDATE: 'staff:profile_update',
    AVAILABILITY_UPDATE: 'staff:availability_update',
    STATUS_CHANGE: 'staff:status_change',
  },
};

module.exports = STAFF_EVENTS;