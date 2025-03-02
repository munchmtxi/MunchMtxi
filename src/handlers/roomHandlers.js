const { EVENTS } = require('@config/events');
const { logger } = require('@utils/logger');
const AppError = require('@utils/AppError');

// Import role-specific room services
const adminRoomService = require('@services/rooms/admin/adminRoomService');
const customerRoomService = require('@services/rooms/customer/customerRoomService');
const driverRoomService = require('@services/rooms/driver/driverRoomService');
const merchantRoomService = require('@services/rooms/merchant/merchantRoomService');
const staffRoomService = require('@services/rooms/staff/staffRoomService');

async function handleAdminMonitoringRoom(socket, io, monitoringData) {
  try {
    const { monitoringType } = monitoringData || {};
    if (!monitoringType) throw new AppError('Missing monitoring type', 400, 'INVALID_DATA');

    const roomId = await adminRoomService.createAdminMonitoringRoom(socket, monitoringType);
    await socket.join(roomId);

    logger.info(`Admin monitoring room setup complete: ${roomId}`, {
      userId: socket.user.id,
      monitoringType
    });
    return roomId;
  } catch (error) {
    logger.error('Error in admin monitoring room handler:', { error: error.message, monitoringData });
    throw new AppError('Failed to setup admin monitoring room', error.statusCode || 500, 'ROOM_SETUP_ERROR', null, { monitoringData });
  }
}

async function handleTableServiceRoom(socket, io, tableData) {
  try {
    const { tableId, merchantId } = tableData || {};
    if (!tableId || !merchantId) throw new AppError('Missing table data', 400, 'INVALID_DATA');

    const roomId = await customerRoomService.createTableServiceRoom(socket, tableId, merchantId);
    await socket.join(roomId);

    await customerRoomService.broadcastToTable(io, tableId, EVENTS.TABLE.STATUS_CHANGED, {
      tableId,
      status: 'active',
      timestamp: new Date()
    });

    logger.info(`Table service room setup complete: ${roomId}`, { userId: socket.user.id, tableId });
    return roomId;
  } catch (error) {
    logger.error('Error in table service room handler:', { error: error.message, tableData });
    throw new AppError('Failed to setup table service room', error.statusCode || 500, 'ROOM_SETUP_ERROR', null, { tableData });
  }
}

async function handleTaxiRideRoom(socket, io, rideData) {
  try {
    const roomId = await customerRoomService.createTaxiRideRoom(socket, rideData || {});
    await socket.join(roomId);

    await customerRoomService.broadcastToTaxiRide(io, rideData.rideId, EVENTS.TAXI.REQUESTED, {
      rideId: rideData.rideId,
      status: 'requested',
      customerLocation: rideData.pickup,
      timestamp: new Date()
    });

    logger.info(`Taxi ride room setup complete: ${roomId}`, { userId: socket.user.id, rideId: rideData.rideId });
    return roomId;
  } catch (error) {
    logger.error('Error in taxi ride room handler:', { error: error.message, rideData });
    throw new AppError('Failed to setup taxi ride room', error.statusCode || 500, 'ROOM_SETUP_ERROR', null, { rideData });
  }
}

async function handleDeliveryZoneSetup(socket, io, zoneData) {
  try {
    const { zoneId, merchantIds } = zoneData || {};
    if (!zoneId || !merchantIds) throw new AppError('Missing zone data', 400, 'INVALID_DATA');

    const roomId = await driverRoomService.createDeliveryZoneRoom(socket, zoneId, merchantIds);
    await socket.join(roomId);

    await driverRoomService.broadcastToDeliveryZone(io, zoneId, EVENTS.DRIVER.ZONE_UPDATED, {
      zoneId,
      activeDrivers: 0,
      pendingOrders: 0,
      timestamp: new Date()
    });

    logger.info(`Delivery zone room setup complete: ${roomId}`, { userId: socket.user.id, zoneId });
    return roomId;
  } catch (error) {
    logger.error('Error in delivery zone room handler:', { error: error.message, zoneData });
    throw new AppError('Failed to setup delivery zone room', error.statusCode || 500, 'ROOM_SETUP_ERROR', null, { zoneData });
  }
}

async function handleTaxiZoneRoom(socket, io, zoneData) {
  try {
    const roomId = await driverRoomService.createTaxiZoneRoom(socket, zoneData || {});
    await socket.join(roomId);

    await driverRoomService.broadcastToTaxiZone(io, zoneData.zoneId, EVENTS.TAXI.ZONE_UPDATED, {
      zoneId: zoneData.zoneId,
      activeDrivers: zoneData.activeDrivers || 0,
      demandLevel: zoneData.demandLevel || 'normal',
      timestamp: new Date()
    });

    logger.info(`Taxi zone room setup complete: ${roomId}`, { userId: socket.user.id, zoneId: zoneData.zoneId });
    return roomId;
  } catch (error) {
    logger.error('Error in taxi zone room handler:', { error: error.message, zoneData });
    throw new AppError('Failed to setup taxi zone room', error.statusCode || 500, 'ROOM_SETUP_ERROR', null, { zoneData });
  }
}

async function handleOrderCreation(socket, io, orderData) {
  try {
    const { orderId, merchantId } = orderData || {};
    if (!orderId || !merchantId) throw new AppError('Missing order data', 400, 'INVALID_DATA');

    const roomId = await merchantRoomService.createOrderProcessingRoom(socket, orderId, merchantId);
    await socket.join(roomId);

    await merchantRoomService.broadcastToOrderRoom(io, orderId, EVENTS.ORDER.CREATED, {
      orderId,
      status: 'created',
      timestamp: new Date()
    });

    logger.info(`Order room setup complete: ${roomId}`, { userId: socket.user.id, orderId });
    return roomId;
  } catch (error) {
    logger.error('Error in order room handler:', { error: error.message, orderData });
    throw new AppError('Failed to setup order room', error.statusCode || 500, 'ROOM_SETUP_ERROR', null, { orderData });
  }
}

async function handleMerchantStaffRoom(socket, io, merchantData) {
  try {
    const { merchantId } = merchantData || {};
    if (!merchantId) throw new AppError('Missing merchant ID', 400, 'INVALID_DATA');

    const roomId = await merchantRoomService.createMerchantStaffRoom(socket, merchantId);
    await socket.join(roomId);

    await merchantRoomService.broadcastToMerchantStaff(io, merchantId, EVENTS.MERCHANT.STAFF_UPDATED, {
      merchantId,
      activeStaff: [],
      timestamp: new Date()
    });

    logger.info(`Merchant staff room setup complete: ${roomId}`, { userId: socket.user.id, merchantId });
    return roomId;
  } catch (error) {
    logger.error('Error in merchant staff room handler:', { error: error.message, merchantData });
    throw new AppError('Failed to setup merchant staff room', error.statusCode || 500, 'ROOM_SETUP_ERROR', null, { merchantData });
  }
}

async function handleTableGroupRoom(socket, io, groupData) {
  try {
    const roomId = await staffRoomService.createTableGroupRoom(socket, groupData || {});
    await socket.join(roomId);

    await staffRoomService.broadcastToTableGroup(io, groupData.groupId, EVENTS.TABLE.GROUP_CREATED, {
      groupId: groupData.groupId,
      tables: groupData.tableIds,
      status: 'active',
      timestamp: new Date()
    });

    logger.info(`Table group room setup complete: ${roomId}`, { userId: socket.user.id, groupId: groupData.groupId });
    return roomId;
  } catch (error) {
    logger.error('Error in table group room handler:', { error: error.message, groupData });
    throw new AppError('Failed to setup table group room', error.statusCode || 500, 'ROOM_SETUP_ERROR', null, { groupData });
  }
}

async function handleServiceAreaRoom(socket, io, areaData) {
  try {
    const roomId = await staffRoomService.createTableServiceArea(socket, areaData || {});
    await socket.join(roomId);

    await staffRoomService.broadcastToServiceArea(io, areaData.areaId, EVENTS.TABLE.AREA_UPDATED, {
      areaId: areaData.areaId,
      activeStaff: areaData.staffIds,
      tables: areaData.tables,
      status: 'active',
      timestamp: new Date()
    });

    logger.info(`Service area room setup complete: ${roomId}`, { userId: socket.user.id, areaId: areaData.areaId });
    return roomId;
  } catch (error) {
    logger.error('Error in service area room handler:', { error: error.message, areaData });
    throw new AppError('Failed to setup service area room', error.statusCode || 500, 'ROOM_SETUP_ERROR', null, { areaData });
  }
}

async function handleQuickLinkRequest(socket, io, requestData) {
  try {
    const { tableId, requestType, areaId } = requestData || {};
    if (!tableId || !requestType || !areaId) throw new AppError('Missing request data', 400, 'INVALID_DATA');

    await Promise.all([
      staffRoomService.broadcastToServiceArea(io, areaId, EVENTS.QUICK_LINK.ASSISTANCE_REQUESTED, {
        tableId,
        requestType,
        timestamp: new Date()
      }),
      customerRoomService.broadcastToTable(io, tableId, EVENTS.QUICK_LINK.REQUEST_ACKNOWLEDGED, {
        requestType,
        status: 'received',
        estimatedResponse: '2-3 minutes',
        timestamp: new Date()
      })
    ]);

    logger.info(`Quick link request processed for table ${tableId}`, { userId: socket.user.id, requestType });
  } catch (error) {
    logger.error('Error in quick link request handler:', { error: error.message, requestData });
    throw new AppError('Failed to process quick link request', error.statusCode || 500, 'QUICK_LINK_ERROR', null, { requestData });
  }
}

module.exports = {
  handleAdminMonitoringRoom,
  handleTableServiceRoom,
  handleTaxiRideRoom,
  handleDeliveryZoneSetup,
  handleTaxiZoneRoom,
  handleOrderCreation,
  handleMerchantStaffRoom,
  handleTableGroupRoom,
  handleServiceAreaRoom,
  handleQuickLinkRequest
};