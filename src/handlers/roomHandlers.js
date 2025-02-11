// src/handlers/roomHandlers.js

const roomService = require('@services/roomService');
const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');

// Notification Handlers
const notificationHandlers = (socket, io, notificationService) => {
  socket.on(EVENTS.NOTIFICATION.READ, async ({ notificationIds }) => {
    try {
      await notificationService.markAsRead(socket.user.id, notificationIds);
      socket.emit(EVENTS.NOTIFICATION.READ, { success: true, notificationIds });
    } catch (error) {
      logger.error('Error in notification read handler:', error);
      socket.emit(EVENTS.ERROR, {
        message: 'Failed to mark notifications as read',
        code: 'NOTIFICATION_READ_ERROR'
      });
    }
  });

  socket.on(EVENTS.NOTIFICATION.READ_ALL, async () => {
    try {
      await notificationService.markAsRead(socket.user.id, 'all');
      socket.emit(EVENTS.NOTIFICATION.READ_ALL, { success: true });
    } catch (error) {
      logger.error('Error in read all notifications handler:', error);
      socket.emit(EVENTS.ERROR, {
        message: 'Failed to mark all notifications as read',
        code: 'NOTIFICATION_READ_ALL_ERROR'
      });
    }
  });
};

// Order Processing Scenario
async function handleOrderCreation(socket, io, orderData) {
  try {
    const { orderId, merchantId } = orderData;
    // Create order processing room
    const roomId = await roomService.createOrderProcessingRoom(socket, orderId, merchantId);
    // Join relevant parties to the room
    await socket.join(roomId); // Customer joins
    // Broadcast order creation
    await roomService.broadcastToOrderRoom(io, orderId, EVENTS.ORDER.CREATED, {
      orderId,
      status: 'created',
      timestamp: new Date(),
    });
    logger.info(`Order room setup complete: ${roomId}`);
    return roomId;
  } catch (error) {
    logger.error('Error in order room creation:', error);
    throw error;
  }
}

// Delivery Zone Scenario
async function handleDeliveryZoneSetup(socket, io, zoneData) {
  try {
    const { zoneId, merchantIds } = zoneData;
    // Create delivery zone room
    const roomId = await roomService.createDeliveryZoneRoom(socket, zoneId, merchantIds);
    // Initial zone broadcast
    await roomService.broadcastToDeliveryZone(io, zoneId, EVENTS.DRIVER.ZONE_UPDATED, {
      zoneId,
      activeDrivers: 0,
      pendingOrders: 0,
      timestamp: new Date(),
    });
    logger.info(`Delivery zone room setup complete: ${roomId}`);
    return roomId;
  } catch (error) {
    logger.error('Error in delivery zone room creation:', error);
    throw error;
  }
}

// Merchant Staff Scenario
async function handleMerchantStaffRoom(socket, io, merchantData) {
  try {
    const { merchantId } = merchantData;
    // Create merchant staff room
    const roomId = await roomService.createMerchantStaffRoom(socket, merchantId);
    // Join merchant and staff to room
    await socket.join(roomId);
    // Initial staff notification
    await roomService.broadcastToMerchantStaff(io, merchantId, EVENTS.MERCHANT.STAFF_UPDATED, {
      merchantId,
      activeStaff: [],
      timestamp: new Date(),
    });
    logger.info(`Merchant staff room setup complete: ${roomId}`);
    return roomId;
  } catch (error) {
    logger.error('Error in merchant staff room creation:', error);
    throw error;
  }
}

// Table Service Scenario
async function handleTableServiceRoom(socket, io, tableData) {
  try {
    const { tableId, merchantId } = tableData;
    // Create table service room
    const roomId = await roomService.createTableServiceRoom(socket, tableId, merchantId);
    // Join customer to room
    await socket.join(roomId);
    // Initial table status broadcast
    await roomService.broadcastToTable(io, tableId, EVENTS.TABLE.STATUS_CHANGED, {
      tableId,
      status: 'active',
      timestamp: new Date(),
    });
    logger.info(`Table service room setup complete: ${roomId}`);
    return roomId;
  } catch (error) {
    logger.error('Error in table service room creation:', error);
    throw error;
  }
}

// Admin Monitoring Scenario
async function handleAdminMonitoringRoom(socket, io, monitoringData) {
  try {
    const { monitoringType } = monitoringData;
    // Create admin monitoring room
    const roomId = await roomService.createAdminMonitoringRoom(socket, monitoringType);
    // Join admin to room
    await socket.join(roomId);
    logger.info(`Admin monitoring room setup complete: ${roomId}`);
    return roomId;
  } catch (error) {
    logger.error('Error in admin monitoring room creation:', error);
    throw error;
  }
}

// Taxi Ride Handlers
async function handleTaxiRideRoom(socket, io, rideData) {
  try {
    const roomId = await roomService.createTaxiRideRoom(socket, rideData);
    // Join customer and driver to room
    await socket.join(roomId);
    // Initial ride status broadcast
    await roomService.broadcastToTaxiRide(io, rideData.rideId, EVENTS.TAXI.REQUESTED, {
      rideId: rideData.rideId,
      status: 'requested',
      customerLocation: rideData.pickup,
      timestamp: new Date(),
    });
    logger.info(`Taxi ride room setup complete: ${roomId}`);
    return roomId;
  } catch (error) {
    logger.error('Error in taxi ride room creation:', error);
    throw error;
  }
}

async function handleTaxiZoneRoom(socket, io, zoneData) {
  try {
    const roomId = await roomService.createTaxiZoneRoom(socket, zoneData);
    // Join driver to zone room
    await socket.join(roomId);
    // Broadcast zone status update
    await roomService.broadcastToTaxiZone(io, zoneData.zoneId, EVENTS.TAXI.ZONE_UPDATED, {
      zoneId: zoneData.zoneId,
      activeDrivers: zoneData.activeDrivers || 0,
      demandLevel: zoneData.demandLevel || 'normal',
      timestamp: new Date(),
    });
    logger.info(`Taxi zone room setup complete: ${roomId}`);
    return roomId;
  } catch (error) {
    logger.error('Error in taxi zone room creation:', error);
    throw error;
  }
}

// Enhanced Table Handlers
async function handleTableGroupRoom(socket, io, groupData) {
  try {
    const roomId = await roomService.createTableGroupRoom(socket, groupData);
    // Join relevant staff to room
    await socket.join(roomId);
    // Initial group status broadcast
    await roomService.broadcastToTableGroup(io, groupData.groupId, EVENTS.TABLE.GROUP_CREATED, {
      groupId: groupData.groupId,
      tables: groupData.tableIds,
      status: 'active',
      timestamp: new Date(),
    });
    logger.info(`Table group room setup complete: ${roomId}`);
    return roomId;
  } catch (error) {
    logger.error('Error in table group room creation:', error);
    throw error;
  }
}

async function handleServiceAreaRoom(socket, io, areaData) {
  try {
    const roomId = await roomService.createTableServiceArea(socket, areaData);
    // Join staff to service area room
    await socket.join(roomId);
    // Initial area status broadcast
    await roomService.broadcastToServiceArea(io, areaData.areaId, EVENTS.TABLE.AREA_UPDATED, {
      areaId: areaData.areaId,
      activeStaff: areaData.staffIds,
      tables: areaData.tables,
      status: 'active',
      timestamp: new Date(),
    });
    logger.info(`Service area room setup complete: ${roomId}`);
    return roomId;
  } catch (error) {
    logger.error('Error in service area room creation:', error);
    throw error;
  }
}

async function handleTableEventRoom(socket, io, eventData) {
  try {
    const roomId = await roomService.createTableEventRoom(socket, eventData);
    // Join event participants to room
    await socket.join(roomId);
    // Initial event status broadcast
    await roomService.broadcastToTableEvent(io, eventData.eventId, EVENTS.TABLE.EVENT_CREATED, {
      eventId: eventData.eventId,
      tables: eventData.tableIds,
      type: eventData.eventType,
      status: 'scheduled',
      timestamp: new Date(),
    });
    logger.info(`Table event room setup complete: ${roomId}`);
    return roomId;
  } catch (error) {
    logger.error('Error in table event room creation:', error);
    throw error;
  }
}

// Quick Link Request Handler
async function handleQuickLinkRequest(socket, io, requestData) {
  try {
    const { tableId, requestType, merchantId } = requestData;
    // Broadcast to service area and table-specific rooms
    await Promise.all([
      roomService.broadcastToServiceArea(io, requestData.areaId, EVENTS.QUICK_LINK.ASSISTANCE_REQUESTED, {
        tableId,
        requestType,
        timestamp: new Date(),
      }),
      roomService.broadcastToTable(io, tableId, EVENTS.QUICK_LINK.REQUEST_ACKNOWLEDGED, {
        requestType,
        status: 'received',
        estimatedResponse: '2-3 minutes',
        timestamp: new Date(),
      }),
    ]);
    logger.info(`Quick link request processed for table ${tableId}`);
  } catch (error) {
    logger.error('Error processing quick link request:', error);
    throw error;
  }
}

module.exports = {
  notificationHandlers,
  handleOrderCreation,
  handleDeliveryZoneSetup,
  handleMerchantStaffRoom,
  handleTableServiceRoom,
  handleAdminMonitoringRoom,
  handleTaxiRideRoom,
  handleTaxiZoneRoom,
  handleTableGroupRoom,
  handleServiceAreaRoom,
  handleTableEventRoom,
  handleQuickLinkRequest,
};
