// src/services/RoomManager.js
const { EVENTS } = require('@config/events');
const { logger } = require('@utils/logger');

class RoomManager {
  constructor() {
    this.io = null;
    this.activeRooms = new Map();
  }

  initialize(io) {
    this.io = io;
  }

  async createRoom(socket, roomData) {
    const { name, type, permissions } = roomData;
    const roomId = `${type}:${name}`;
    
    if (this.activeRooms.has(roomId)) {
      throw new Error('Room already exists');
    }
    
    this.activeRooms.set(roomId, {
      id: roomId,
      type,
      name,
      permissions,
      createdBy: socket.user.id,
      createdAt: new Date(),
      members: new Set(),
    });
    
    return roomId;
  }

  async joinRoom(socket, roomId) {
    const room = this.activeRooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    const canJoin = await this.checkRoomPermissions(socket.user, room);
    if (!canJoin) {
      throw new Error('Insufficient permissions to join room');
    }
    
    socket.join(roomId);
    room.members.add(socket.user.id);
    
    if (this.io) {
      socket.to(roomId).emit(EVENTS.ROOM.MEMBER_JOINED, {
        roomId,
        userId: socket.user.id,
        role: socket.user.role
      });
    }
    
    return room;
  }

  async leaveRoom(socket, roomId) {
    const room = this.activeRooms.get(roomId);
    if (!room) {
      throw new Error('Room not found');
    }
    
    socket.leave(roomId);
    room.members.delete(socket.user.id);
    
    if (room.members.size === 0 && room.type !== 'permanent') {
      this.activeRooms.delete(roomId);
    }
    
    if (this.io) {
      socket.to(roomId).emit(EVENTS.ROOM.MEMBER_LEFT, {
        roomId,
        userId: socket.user.id
      });
    }
  }

  async checkRoomPermissions(user, room) {
    if (!room.permissions) return true;
    
    if (room.permissions.roles && !room.permissions.roles.includes(user.role)) {
      return false;
    }
    
    if (room.permissions.users && !room.permissions.users.includes(user.id)) {
      return false;
    }
    
    if (room.permissions.customCheck) {
      return await room.permissions.customCheck(user);
    }
    
    return true;
  }

  async getUserAccessibleRooms(user) {
    const accessibleRooms = [];
    for (const [roomId, room] of this.activeRooms) {
      if (await this.checkRoomPermissions(user, room)) {
        accessibleRooms.push(roomId);
      }
    }
    return accessibleRooms;
  }

  getRoom(roomId) {
    return this.activeRooms.get(roomId);
  }

  getRoomMembers(roomId) {
    const room = this.activeRooms.get(roomId);
    return room ? Array.from(room.members) : [];
  }
}

// Create a singleton instance
const roomManager = new RoomManager();
module.exports = roomManager;