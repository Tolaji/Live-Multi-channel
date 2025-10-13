// backend/services/socketService.js

class SocketService {
  constructor() {
    this.io = null;
  }

  setIO(io) {
    this.io = io;
  }

  getIO() {
    if (!this.io) {
      throw new Error('Socket.IO not initialized. Call setIO() first.');
    }
    return this.io;
  }

  // Notify specific user
  notifyUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  // Notify all users
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Notify multiple users
  notifyUsers(userIds, event, data) {
    if (this.io) {
      userIds.forEach(userId => {
        this.io.to(`user:${userId}`).emit(event, data);
      });
    }
  }
}

// Create singleton instance
export const socketService = new SocketService();
export default socketService;