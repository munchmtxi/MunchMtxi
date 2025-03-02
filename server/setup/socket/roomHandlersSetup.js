// server/setup/socket/roomHandlersSetup.js
const { EVENTS } = require('@config/events');
const { logger } = require('@utils/logger');
const roomHandlers = require('@handlers/roomHandlers');
const roomManager = require('@services/rooms/core/roomManager');

module.exports = {
  setupRoomHandlers: (socket, io) => {
    socket.on(EVENTS.CONNECT, async () => {
      try {
        const { user } = socket;
        socket.join(`role:${user.role}`);
        socket.join(`user:${user.id}`);
        const accessibleRooms = await roomManager.getUserAccessibleRooms(user);
        for (const roomId of accessibleRooms) {
          await roomManager.joinRoom(socket, roomId);
        }
        if (user.role.toUpperCase() === 'ADMIN') socket.join('system:monitoring');
        logger.info(`Rooms joined for user ${user.id}`, { userId: user.id, socketId: socket.id, rooms: Array.from(socket.rooms) });
      } catch (error) {
        logger.error('Error joining rooms:', { error: error.message, userId: socket.user.id });
        socket.emit(EVENTS.ERROR, { message: 'Connection error', code: 'CONNECTION_ERROR' });
        socket.disconnect(true);
      }
    });

    socket.on(EVENTS.TAXI.REQUESTED, async (rideData) => {
      try {
        await roomHandlers.handleTaxiRideRoom(socket, io, rideData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on(EVENTS.TABLE.BOOKED, async (tableData) => {
      try {
        await roomHandlers.handleTableServiceRoom(socket, io, tableData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on(EVENTS.QUICK_LINK.ASSISTANCE_REQUESTED, async (requestData) => {
      try {
        await roomHandlers.handleQuickLinkRequest(socket, io, requestData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'QUICK_LINK_ERROR' });
      }
    });

    socket.on(EVENTS.TABLE_ROOM.AREA_UPDATED, async (areaData) => {
      try {
        await roomHandlers.handleServiceAreaRoom(socket, io, areaData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on(EVENTS.TABLE_ROOM.GROUP_CREATED, async (groupData) => {
      try {
        await roomHandlers.handleTableGroupRoom(socket, io, groupData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on('orderCreated', async (orderData) => {
      try {
        await roomHandlers.handleOrderCreation(socket, io, orderData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on('monitorSetup', async (monitoringData) => {
      try {
        await roomHandlers.handleAdminMonitoringRoom(socket, io, monitoringData);
      } catch (error) {
        socket.emit(EVENTS.ERROR, { message: error.message, code: error.errorCode || 'ROOM_SETUP_ERROR' });
      }
    });

    socket.on(EVENTS.DISCONNECT, async () => {
      try {
        if (socket.user) {
          await require('@models').User.update({ lastOnline: new Date() }, { where: { id: socket.user.id } });
        }
        const userRooms = Array.from(socket.rooms);
        for (const roomId of userRooms) {
          if (roomId !== socket.id) await roomManager.leaveRoom(socket, roomId);
        }
        logger.info(`User disconnected: ${socket.user?.id}`, { userId: socket.user?.id, socketId: socket.id });
      } catch (error) {
        logger.error('Error in disconnect handling:', { error: error.message });
      }
    });
  }
};