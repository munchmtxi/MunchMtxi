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
    PROFILE_UPDATED: 'merchant:profileUpdated',
    SETTINGS_UPDATED: 'merchant:settingsUpdated',
    STATUS_CHANGED: 'merchant:statusChanged',
    
    // Inventory and Menu
    INVENTORY_UPDATED: 'merchant:inventoryUpdated',
    MENU_UPDATED: 'merchant:menuUpdated',
    LOW_STOCK_ALERT: 'merchant:lowStockAlert',
    
    // Staff
    STAFF_ADDED: 'merchant:staffAdded',
    STAFF_REMOVED: 'merchant:staffRemoved',
    STAFF_UPDATED: 'merchant:staffUpdated',
    
    // Analytics
    ANALYTICS_UPDATED: 'merchant:analyticsUpdated',
    REPORT_GENERATED: 'merchant:reportGenerated'
  },

  // Staff Events
  STAFF: {
    // Authentication and Profile
    LOGGED_IN: 'staff:loggedIn',
    LOGGED_OUT: 'staff:loggedOut',
    PROFILE_UPDATED: 'staff:profileUpdated',
    'TWO_FACTOR_SETUP': 'staff:2fa:setup',
    'TWO_FACTOR_COMPLETE': 'staff:2fa:complete',
    'TWO_FACTOR_VERIFY': 'staff:2fa:verify',
    
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
