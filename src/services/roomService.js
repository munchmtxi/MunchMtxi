// src/services/roomService.js

const { EVENTS } = require('@config/events');
const logger = require('@utils/logger');
const roomManager = require('@services/RoomManager');

class RoomService {
  // Order Processing Rooms
  async createOrderProcessingRoom(socket, orderId, merchantId) {
    const roomData = {
      name: `order-${orderId}`,
      type: 'order-processing',
      permissions: {
        roles: ['MERCHANT', 'STAFF', 'DRIVER', 'CUSTOMER'],
        customCheck: async (user) => {
          return user.id === merchantId ||
                 user.id === socket.user.id ||
                 user.role === 'ADMIN';
        }
      }
    };

    const roomId = await roomManager.createRoom(socket, roomData);
    logger.info(`Order processing room created: ${roomId}`);
    return roomId;
  }

  // Delivery Zone Rooms
  async createDeliveryZoneRoom(socket, zoneId, merchantIds) {
    const roomData = {
      name: `zone-${zoneId}`,
      type: 'delivery-zone',
      permissions: {
        roles: ['DRIVER', 'MERCHANT'],
        customCheck: async (user) => {
          return merchantIds.includes(user.merchantId) ||
                 user.role === 'ADMIN';
        }
      }
    };

    const roomId = await roomManager.createRoom(socket, roomData);
    logger.info(`Delivery zone room created: ${roomId}`);
    return roomId;
  }

  // Merchant Staff Rooms
  async createMerchantStaffRoom(socket, merchantId) {
    const roomData = {
      name: `merchant-${merchantId}-staff`,
      type: 'merchant-staff',
      permissions: {
        roles: ['MERCHANT', 'STAFF'],
        customCheck: async (user) => {
          return user.merchantId === merchantId ||
                 user.role === 'ADMIN';
        }
      }
    };

    const roomId = await roomManager.createRoom(socket, roomData);
    logger.info(`Merchant staff room created: ${roomId}`);
    return roomId;
  }

  // Table Service Rooms
  async createTableServiceRoom(socket, tableId, merchantId) {
    const roomData = {
      name: `table-${tableId}`,
      type: 'table-service',
      permissions: {
        roles: ['MERCHANT', 'STAFF', 'CUSTOMER'],
        customCheck: async (user) => {
          return user.merchantId === merchantId ||
                 user.tableId === tableId ||
                 user.role === 'ADMIN';
        }
      }
    };

    const roomId = await roomManager.createRoom(socket, roomData);
    logger.info(`Table service room created: ${roomId}`);
    return roomId;
  }

  // Admin Monitoring Rooms
  async createAdminMonitoringRoom(socket, monitoringType) {
    const roomData = {
      name: `monitoring-${monitoringType}`,
      type: 'admin-monitoring',
      permissions: {
        roles: ['ADMIN'],
        customCheck: async (user) => {
          return user.isSuper ||
                 user.permissions.includes(`monitor:${monitoringType}`);
        }
      }
    };

    const roomId = await roomManager.createRoom(socket, roomData);
    logger.info(`Admin monitoring room created: ${roomId}`);
    return roomId;
  }

  // Taxi Booking Rooms
  async createTaxiRideRoom(socket, rideData) {
    const { rideId, customerId, driverId } = rideData;
    const roomData = {
      name: `taxi-ride-${rideId}`,
      type: 'taxi-ride',
      permissions: {
        roles: ['DRIVER', 'CUSTOMER', 'ADMIN'],
        customCheck: async (user) => {
          return user.id === customerId ||
                 user.id === driverId ||
                 user.role === 'ADMIN';
        }
      }
    };

    const roomId = await roomManager.createRoom(socket, roomData);
    logger.info(`Taxi ride room created: ${roomId}`);
    return roomId;
  }

  async createTaxiZoneRoom(socket, zoneData) {
    const { zoneId } = zoneData;
    const roomData = {
      name: `taxi-zone-${zoneId}`,
      type: 'taxi-zone',
      permissions: {
        roles: ['DRIVER', 'ADMIN'],
        customCheck: async (user) => {
          return user.authorizedZones?.includes(zoneId) ||
                 user.role === 'ADMIN';
        }
      }
    };

    const roomId = await roomManager.createRoom(socket, roomData);
    logger.info(`Taxi zone room created: ${roomId}`);
    return roomId;
  }

  // Enhanced Table Management Rooms
  async createTableGroupRoom(socket, groupData) {
    const { groupId, tableIds, merchantId } = groupData;
    const roomData = {
      name: `table-group-${groupId}`,
      type: 'table-group',
      permissions: {
        roles: ['MERCHANT', 'STAFF', 'CUSTOMER'],
        customCheck: async (user) => {
          return user.merchantId === merchantId ||
                 tableIds.includes(user.tableId) ||
                 user.role === 'ADMIN';
        }
      }
    };

    const roomId = await roomManager.createRoom(socket, roomData);
    logger.info(`Table group room created: ${roomId}`);
    return roomId;
  }

  async createTableServiceArea(socket, areaData) {
    const { areaId, merchantId, staffIds } = areaData;
    const roomData = {
      name: `service-area-${areaId}`,
      type: 'service-area',
      permissions: {
        roles: ['MERCHANT', 'STAFF'],
        customCheck: async (user) => {
          return user.merchantId === merchantId ||
                 staffIds.includes(user.id) ||
                 user.role === 'ADMIN';
        }
      }
    };

    const roomId = await roomManager.createRoom(socket, roomData);
    logger.info(`Service area room created: ${roomId}`);
    return roomId;
  }

  async createTableEventRoom(socket, eventData) {
    const { eventId, tableIds, merchantId } = eventData;
    const roomData = {
      name: `table-event-${eventId}`,
      type: 'table-event',
      permissions: {
        roles: ['MERCHANT', 'STAFF', 'CUSTOMER'],
        customCheck: async (user) => {
          return user.merchantId === merchantId ||
                 tableIds.includes(user.tableId) ||
                 user.role === 'ADMIN';
        }
      }
    };

    const roomId = await roomManager.createRoom(socket, roomData);
    logger.info(`Table event room created: ${roomId}`);
    return roomId;
  }

  // Broadcast methods for different scenarios

  async broadcastToOrderRoom(io, orderId, event, data) {
    const roomId = `order-processing:order-${orderId}`;
    io.to(roomId).emit(event, data);
    logger.info(`Broadcast to order room: ${roomId}`, { event, data });
  }

  async broadcastToDeliveryZone(io, zoneId, event, data) {
    const roomId = `delivery-zone:zone-${zoneId}`;
    io.to(roomId).emit(event, data);
    logger.info(`Broadcast to delivery zone: ${roomId}`, { event, data });
  }

  async broadcastToMerchantStaff(io, merchantId, event, data) {
    const roomId = `merchant-staff:merchant-${merchantId}-staff`;
    io.to(roomId).emit(event, data);
    logger.info(`Broadcast to merchant staff: ${roomId}`, { event, data });
  }

  async broadcastToTable(io, tableId, event, data) {
    const roomId = `table-service:table-${tableId}`;
    io.to(roomId).emit(event, data);
    logger.info(`Broadcast to table: ${roomId}`, { event, data });
  }

  // Broadcast methods for taxi scenarios

  async broadcastToTaxiRide(io, rideId, event, data) {
    const roomId = `taxi-ride:taxi-ride-${rideId}`;
    io.to(roomId).emit(event, data);
    logger.info(`Broadcast to taxi ride: ${roomId}`, { event, data });
  }

  async broadcastToTaxiZone(io, zoneId, event, data) {
    const roomId = `taxi-zone:taxi-zone-${zoneId}`;
    io.to(roomId).emit(event, data);
    logger.info(`Broadcast to taxi zone: ${roomId}`, { event, data });
  }

  // Broadcast methods for enhanced table scenarios

  async broadcastToTableGroup(io, groupId, event, data) {
    const roomId = `table-group:table-group-${groupId}`;
    io.to(roomId).emit(event, data);
    logger.info(`Broadcast to table group: ${roomId}`, { event, data });
  }

  async broadcastToServiceArea(io, areaId, event, data) {
    const roomId = `service-area:service-area-${areaId}`;
    io.to(roomId).emit(event, data);
    logger.info(`Broadcast to service area: ${roomId}`, { event, data });
  }

  async broadcastToTableEvent(io, eventId, event, data) {
    const roomId = `table-event:table-event-${eventId}`;
    io.to(roomId).emit(event, data);
    logger.info(`Broadcast to table event: ${roomId}`, { event, data });
  }
}

module.exports = new RoomService();
