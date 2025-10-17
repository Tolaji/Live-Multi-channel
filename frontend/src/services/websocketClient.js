// services/websocketClient.js

import io from 'socket.io-client';

class WebSocketClient {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    // Use environment variable with fallback for production
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 
      (window.location.hostname.includes('vercel.app') 
        ? 'https://live-multi-channel.onrender.com' 
        : 'http://localhost:3000')
  }
  
  connect() {
    if (this.socket?.connected) return;
    
    this.socket = io(this.backendUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
    
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected:', this.socket.id);
    });
    
    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });
    
    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
    
    // Forward events to registered listeners
    this.socket.onAny((eventName, data) => {
      const callbacks = this.listeners.get(eventName) || [];
      callbacks.forEach(callback => callback(data));
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  on(eventName, callback) {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, []);
    }
    this.listeners.get(eventName).push(callback);
  }
  
  off(eventName, callback) {
    const callbacks = this.listeners.get(eventName) || [];
    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }
  }
  
  emit(eventName, data) {
    if (this.socket?.connected) {
      this.socket.emit(eventName, data);
    }
  }
}

export default new WebSocketClient();