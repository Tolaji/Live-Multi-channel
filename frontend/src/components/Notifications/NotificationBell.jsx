// components/Notifications/NotificationBell.jsx

import React, { useState, useEffect } from 'react';
import websocketClient from '../../services/websocketClient';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  
  useEffect(() => {
    // Load existing notifications from backend
    async function loadNotifications() {
      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/notifications`,
          { credentials: 'include' }
        );
        
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    }
    
    loadNotifications();
    
    // Listen for new notifications via WebSocket
    const handleNewNotification = (data) => {
      const notification = {
        id: Date.now(),
        channelId: data.channelId,
        videoId: data.videoId,
        title: data.title,
        message: `${data.title} is now live!`,
        timestamp: new Date().toISOString(),
        read: false
      };
      
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Live Stream Started', {
          body: notification.message,
          icon: '/logo.png',
          tag: data.videoId
        });
      }
    };
    
    websocketClient.on('channel:live', handleNewNotification);
    
    return () => {
      websocketClient.off('channel:live', handleNewNotification);
    };
  }, []);
  
  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  const handleMarkAllRead = async () => {
    try {
      await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/notifications/mark-read`,
        {
          method: 'POST',
          credentials: 'include'
        }
      );
      
      setUnreadCount(0);
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
    } catch (err) {
      console.error('Error marking notifications as read:', err);
    }
  };
  
  const handleClearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };
  
  return (
    <div className="relative">
      {/* Bell icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 hover:bg-gray-700 rounded transition"
      >
        <svg 
          className="w-6 h-6" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      
      {/* Dropdown */}
      {showDropdown && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-20 max-h-96 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              {notifications.length > 0 && (
                <div className="flex gap-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-orange-500 hover:text-orange-400"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-gray-400 hover:text-gray-300"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
            
            {/* Notification list */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <div className="text-4xl mb-2">🔔</div>
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`px-4 py-3 border-b border-gray-700 hover:bg-gray-750 cursor-pointer transition ${
                      !notification.read ? 'bg-gray-750' : ''
                    }`}
                    onClick={() => {
                      // Navigate to the live stream
                      window.location.hash = `#/watch/${notification.videoId}`;
                      setShowDropdown(false);
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {!notification.read && (
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTimestamp(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}