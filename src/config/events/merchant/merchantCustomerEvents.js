'use strict';

const MERCHANT_CUSTOMER_EVENTS = {
  MERCHANT: {
    BOOKING_ASSIGNED: 'merchant:booking_assigned',
    TABLE_STAFF_UPDATE: 'merchant:table_staff_update',
    ORDER_UPDATED: 'merchant:order_updated',
    ORDER_READY: 'merchant:order_ready',
    SUBSCRIPTION_ORDER_CREATED: 'merchant:subscription_order_created',
    PERFORMANCE_REPORT: 'merchant:performance_report',
    STAFF_FEEDBACK_UPDATED: 'merchant:staff_feedback_updated',
    TABLE_STATUS_UPDATE: 'merchant:table_status_update',
    SUCCESS: 'merchant:success',
    ERROR: 'merchant:error',
  },
};

module.exports = MERCHANT_CUSTOMER_EVENTS;