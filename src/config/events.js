// src/config/events.js

const EVENTS = {
  // System Events
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  RECONNECT: 'reconnect',
  RECONNECT_ATTEMPT: 'reconnect_attempt',

  // User Events
  USER: {
    CONNECTED: 'user:connected',
    DISCONNECTED: 'user:disconnected',
    STATUS_CHANGED: 'user:statusChanged',
    PROFILE_UPDATED: 'user:profileUpdated'
  },

  // Authentication Events
  AUTH: {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    SESSION_EXPIRED: 'auth:sessionExpired',
    TOKEN_REFRESH: 'auth:tokenRefresh'
  },

  // Order Events
  ORDER: {
    // Creation and Updates
    CREATED: 'order:created',
    UPDATED: 'order:updated',
    CANCELLED: 'order:cancelled',
    ASSIGNED: 'order:assigned',

    // Status Changes
    STATUS_CHANGED: 'order:statusChanged',
    PAYMENT_STATUS_CHANGED: 'order:paymentStatusChanged',

    // Notifications
    CONFIRMATION: 'order:confirmation',
    READY_FOR_PICKUP: 'order:readyForPickup',
    PICKUP_CONFIRMED: 'order:pickupConfirmed',
    DELIVERY_STARTED: 'order:deliveryStarted',
    DELIVERED: 'order:delivered',

    // Modifications
    ITEMS_MODIFIED: 'order:itemsModified',
    SPECIAL_REQUEST: 'order:specialRequest'
  },

  // Driver Events
  DRIVER: {
    // Status and Location
    LOCATION_UPDATED: 'driver:locationUpdated',
    STATUS_CHANGED: 'driver:statusChanged',
    AVAILABILITY_UPDATED: 'driver:availabilityUpdated',
    ASSIGNED: 'driver:assigned',

    // Vehicle and Profile
    VEHICLE_UPDATED: 'driver:vehicleUpdated',
    PROFILE_UPDATED: 'driver:profileUpdated',

    // Performance
    PERFORMANCE_METRICS: 'driver:performanceMetrics',
    EARNINGS_UPDATED: 'driver:earningsUpdated',

    // Route
    ROUTE_OPTIMIZED: 'driver:routeOptimized',
    ROUTE_CHANGED: 'driver:routeChanged'
  },

  // Merchant Events
  MERCHANT: {
    // Profile and Settings
    PROFILE_UPDATED: 'merchant:profile:updated',
    SETTINGS_UPDATED: 'merchant:settings:updated',
    STATUS_CHANGED: 'merchant:status:changed',

    // Metrics Events
    METRICS: {
      // Subscription
      SUBSCRIBE: 'merchant:metrics:subscribe',
      SUBSCRIBED: 'merchant:metrics:subscribed',
      UNSUBSCRIBE: 'merchant:metrics:unsubscribe',
      UNSUBSCRIBED: 'merchant:metrics:unsubscribed',

      // Real-time data
      GET_LIVE: 'merchant:metrics:getLive',
      LIVE_DATA: 'merchant:metrics:liveData',
      GET_PERIOD: 'merchant:metrics:getPeriod',
      PERIOD_DATA: 'merchant:metrics:periodData',
      
      // Updates
      UPDATED: 'merchant:metrics:updated',
      ORDER_UPDATED: 'merchant:metrics:orderUpdated',
      REVENUE_UPDATED: 'merchant:metrics:revenueUpdated',
      RATING_UPDATED: 'merchant:metrics:ratingUpdated',

      // Status
      CALCULATION_STARTED: 'merchant:metrics:calculationStarted',
      CALCULATION_COMPLETED: 'merchant:metrics:calculationCompleted',
      CALCULATION_FAILED: 'merchant:metrics:calculationFailed'
    },

    // Detailed Profile Events
    PROFILE: {
      // Basic Profile Operations
      GET: 'merchant:profile:get',
      VIEWED: 'merchant:profile:viewed',
      GET_ERROR: 'merchant:profile:get:error',
      
      // Update Operations
      UPDATE_REQUESTED: 'merchant:profile:updateRequested',
      UPDATE_SUCCEEDED: 'merchant:profile:updateSucceeded',
      UPDATE_FAILED: 'merchant:profile:updateFailed',
      VALIDATION_ERROR: 'merchant:profile:validationError',

      // Image Operations
      IMAGE_UPLOAD_REQUESTED: 'merchant:profile:image:uploadRequested',
      IMAGE_UPLOAD_SUCCEEDED: 'merchant:profile:image:uploadSucceeded',
      IMAGE_UPLOAD_FAILED: 'merchant:profile:image:uploadFailed',
      IMAGE_DELETION_REQUESTED: 'merchant:profile:image:deletionRequested',
      IMAGE_DELETION_SUCCEEDED: 'merchant:profile:image:deletionSucceeded',
      IMAGE_DELETION_FAILED: 'merchant:profile:image:deletionFailed',

      // Image Types
      LOGO_UPDATED: 'merchant:profile:logoUpdated',
      BANNER_UPDATED: 'merchant:profile:bannerUpdated',
      STOREFRONT_UPDATED: 'merchant:profile:storefrontUpdated',

      // Business Details
      BUSINESS_NAME_UPDATED: 'merchant:profile:businessNameUpdated',
      ADDRESS_UPDATED: 'merchant:profile:addressUpdated',
      PHONE_UPDATED: 'merchant:profile:phoneUpdated',
      HOURS_UPDATED: 'merchant:profile:hoursUpdated',

      // Preferences
      CURRENCY_UPDATED: 'merchant:profile:currencyUpdated',
      TIMEZONE_UPDATED: 'merchant:profile:timezoneUpdated',
      NOTIFICATION_PREFS_UPDATED: 'merchant:profile:notificationPrefsUpdated',
      WHATSAPP_STATUS_UPDATED: 'merchant:profile:whatsappStatusUpdated',

      // Location and Service Area
      LOCATION_UPDATED: 'merchant:profile:locationUpdated',
      SERVICE_RADIUS_UPDATED: 'merchant:profile:serviceRadiusUpdated',
      DELIVERY_AREA_UPDATED: 'merchant:profile:deliveryAreaUpdated',
      GEOFENCE_UPDATED: 'merchant:profile:geofenceUpdated',

      // Analytics Events (New additions)
      ANALYTICS_UPDATED: 'merchant_profile_analytics_updated',
      ACTIVE_VIEWERS_UPDATED: 'merchant_profile_active_viewers_updated'
    },

    BUSINESS_TYPE: {
      UPDATE: 'merchant:businessType:update',
      UPDATED: 'merchant:businessType:updated',
      VALIDATION_FAILED: 'merchant:businessType:validationFailed',
      REQUIREMENTS_UPDATED: 'merchant:businessType:requirements:updated',
      PREVIEW_REQUESTED: 'merchant:businessType:preview:requested',
      PREVIEW_GENERATED: 'merchant:businessType:preview:generated'
    },

    // Draft Events
    DRAFT: {
      UPDATE: 'merchant:draft:update',
      UPDATED: 'merchant:draft:updated',
      SUBMIT: 'merchant:draft:submit',
      SUBMITTED: 'merchant:draft:submitted'
    },

    // Banner Events
    BANNER: {
      UPDATE: 'merchant:banner:update',
      UPDATED: 'merchant:banner:updated',
      DELETED: 'merchant:banner:deleted',
      ORDER_UPDATED: 'merchant:banner:order:updated'
    },

    // Preview Events
    PREVIEW: {
      START: 'merchant:preview:start',
      UPDATE: 'merchant:preview:update',
      END: 'merchant:preview:end'
    },

    // Activity Events
    ACTIVITY: {
      SUBSCRIBE: 'merchant:activity:subscribe',
      SUBSCRIBED: 'merchant:activity:subscribed',
      UNSUBSCRIBE: 'merchant:activity:unsubscribe',
      UNSUBSCRIBED: 'merchant:activity:unsubscribed',
      UPDATE: 'merchant:activity:update',
      STATS_UPDATE: 'merchant:activity:stats:update'
    },

    // Inventory and Menu
    INVENTORY_UPDATED: 'merchant:inventory:updated',
    MENU_UPDATED: 'merchant:menu:updated',
    LOW_STOCK_ALERT: 'merchant:lowStock:alert',

    // Staff (merchant-specific)
    STAFF_ADDED: 'merchant:staff:added',
    STAFF_REMOVED: 'merchant:staff:removed',
    STAFF_UPDATED: 'merchant:staff:updated',

    // Analytics (General)
    ANALYTICS_UPDATED: 'merchant:analytics:updated',
    REPORT_GENERATED: 'merchant:report:generated',

    // Merchant Password Events
    PASSWORD: {
      CHANGED: 'MERCHANT_PASSWORD_CHANGED',
      FAILED_ATTEMPT: 'MERCHANT_PASSWORD_FAILED_ATTEMPT',
      LOCKED: 'MERCHANT_PASSWORD_ACCOUNT_LOCKED',
      UNLOCKED: 'MERCHANT_PASSWORD_ACCOUNT_UNLOCKED',
      RESET_REQUESTED: 'MERCHANT_PASSWORD_RESET_REQUESTED',
      RESET_COMPLETED: 'MERCHANT_PASSWORD_RESET_COMPLETED',
      STRENGTH_UPDATED: 'MERCHANT_PASSWORD_STRENGTH_UPDATED',
      // Socket Events for Password Management
      SOCKET: {
        CHANGE: 'merchant.password.change',
        CHANGED: 'merchant.password.changed',
        ERROR: 'merchant.password.error',
        HISTORY: 'merchant.password.history',
        STRENGTH: 'merchant.password.strength',
        LOCKED: 'merchant.password.locked',
        UNLOCKED: 'merchant.password.unlocked'
      }
    },

    // Address Events
    ADDRESS: {
      GET_SUGGESTIONS: 'merchant:address:get_suggestions',
      GET_DETAILS: 'merchant:address:get_details',
      SUGGESTIONS: 'merchant:address:suggestions',
      DETAILS: 'merchant:address:details'
    }
  },

  // Error Events
  ERROR: {
    PROFILE: {
      NOT_FOUND: 'error:profile:not_found',
      SERVER_ERROR: 'error:profile:server_error',
      VALIDATION_ERROR: 'error:profile:validation_error',
      UNAUTHORIZED: 'error:profile:unauthorized'
    },
    METRICS: {
      ERROR: 'error:metrics:error',
      CALCULATION_ERROR: 'error:metrics:calculationError',
      SUBSCRIPTION_ERROR: 'error:metrics:subscriptionError',
      DATA_ERROR: 'error:metrics:dataError'
    }
  },

  // Staff Events
  STAFF: {
    // Authentication and Profile
    LOGGED_IN: 'staff:loggedIn',
    LOGGED_OUT: 'staff:loggedOut',
    PROFILE_UPDATED: 'staff:profileUpdated',
    TWO_FACTOR_SETUP: 'staff:2fa:setup',
    TWO_FACTOR_COMPLETE: 'staff:2fa:complete',
    TWO_FACTOR_VERIFY: 'staff:2fa:verify',

    // Tasks and Assignments
    TASK_ASSIGNED: 'staff:taskAssigned',
    TASK_COMPLETED: 'staff:taskCompleted',
    TASK_UPDATED: 'staff:taskUpdated',

    // Performance
    PERFORMANCE_UPDATED: 'staff:performanceUpdated',
    SCHEDULE_UPDATED: 'staff:scheduleUpdated',

    // Permissions
    PERMISSIONS_UPDATED: 'staff:permissionsUpdated'
  },

  // Taxi Events
  TAXI: {
    // Ride Status
    REQUESTED: 'taxi:requested',
    ACCEPTED: 'taxi:accepted',
    STARTED: 'taxi:started',
    LOCATION_UPDATED: 'taxi:locationUpdated',
    COMPLETED: 'taxi:completed',
    CANCELLED: 'taxi:cancelled',

    // Fare and Payment
    FARE_ESTIMATED: 'taxi:fareEstimated',
    FARE_UPDATED: 'taxi:fareUpdated',
    PAYMENT_COMPLETED: 'taxi:paymentCompleted',

    // Driver Assignment
    DRIVER_ASSIGNED: 'taxi:driverAssigned',
    DRIVER_ARRIVED: 'taxi:driverArrived'
  },

  // Table Events
  TABLE: {
    // Booking Status
    BOOKED: 'table:booked',
    STATUS_CHANGED: 'table:statusChanged',
    CANCELLED: 'table:cancelled',
    CHECKED_IN: 'table:checkedIn',
    CHECKED_OUT: 'table:checkedOut',

    // Updates
    GUESTS_UPDATED: 'table:guestsUpdated',
    TIME_UPDATED: 'table:timeUpdated',
    SPECIAL_REQUEST: 'table:specialRequest'
  },

  // Quick Link Events
  QUICK_LINK: {
    // Customer Requests
    ASSISTANCE_REQUESTED: 'quickLink:assistanceRequested',
    BILL_REQUESTED: 'quickLink:billRequested',
    EMERGENCY_HELP: 'quickLink:emergencyHelp',
    WAITER_CALLED: 'quickLink:waiterCalled',
    ORDER_ADDITION: 'quickLink:orderAddition',

    // Staff Response
    STAFF_ASSIGNED: 'quickLink:staffAssigned',
    REQUEST_COMPLETED: 'quickLink:requestCompleted',
    REQUEST_ACKNOWLEDGED: 'quickLink:requestAcknowledged'
  },

  // Payment Events
  PAYMENT: {
    INITIATED: 'payment:initiated',
    PROCESSING: 'payment:processing',
    COMPLETED: 'payment:completed',
    FAILED: 'payment:failed',
    REFUNDED: 'payment:refunded',
    TIP_ADDED: 'payment:tipAdded'
  },

  // Notification Events
  NOTIFICATION: {
    SENT: 'notification:sent',
    DELIVERED: 'notification:delivered',
    READ: 'notification:read',
    FAILED: 'notification:failed'
  },

  // Analytics Events
  ANALYTICS: {
    UPDATED: 'analytics:updated',
    REPORT_GENERATED: 'analytics:reportGenerated',
    METRICS_UPDATED: 'analytics:metricsUpdated'
  },

  // Admin Events
  ADMIN: {
    // User Management
    USER_CREATED: 'admin:userCreated',
    USER_UPDATED: 'admin:userUpdated',
    USER_DELETED: 'admin:userDeleted',

    // System Management
    SYSTEM_ALERT: 'admin:systemAlert',
    CONFIG_UPDATED: 'admin:configUpdated',
    MAINTENANCE_STARTED: 'admin:maintenanceStarted',
    MAINTENANCE_ENDED: 'admin:maintenanceEnded',

    // Monitoring
    METRICS_UPDATED: 'admin:metricsUpdated',
    LOG_ALERT: 'admin:logAlert'
  },

  // Room Events
  ROOM: {
    // Room Management
    CREATED: 'room:created',
    DELETED: 'room:deleted',
    UPDATED: 'room:updated',

    // Membership
    MEMBER_JOINED: 'room:memberJoined',
    MEMBER_LEFT: 'room:memberLeft',
    MEMBER_KICKED: 'room:memberKicked',

    // Permissions
    PERMISSIONS_UPDATED: 'room:permissionsUpdated',

    // Messages
    MESSAGE: 'room:message',
    BROADCAST: 'room:broadcast',

    // Status
    STATUS_CHANGED: 'room:statusChanged'
  },

  // Table Room Events
  TABLE_ROOM: {
    GROUP_CREATED: 'tableRoom:groupCreated',
    AREA_UPDATED: 'tableRoom:areaUpdated',
    EVENT_CREATED: 'tableRoom:eventCreated'
  },

  // Taxi Room Events
  TAXI_ROOM: {
    ZONE_UPDATED: 'taxiRoom:zoneUpdated',
    RIDE_UPDATED: 'taxiRoom:rideUpdated'
  }
};

// Freeze the events object to prevent modifications
Object.freeze(EVENTS);
module.exports = { EVENTS };
