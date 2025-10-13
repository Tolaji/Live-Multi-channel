import { userNotification } from '../services/userNotification.js'

export class NotificationBell {
  constructor() {
    this.notifications = []
    this.unreadCount = 0
    this.showDropdown = false
  }

  mount(container) {
    this.container = container
    this.loadNotifications()
    this.setupWebSocket()
    this.render()
  }

  async loadNotifications() {
    try {
      // Simulate loading notifications
      this.notifications = await userNotification.getNotifications()
      this.unreadCount = this.notifications.filter(n => !n.read).length
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      this.render()
    }
  }

  setupWebSocket() {
    // In real app, this would connect to your WebSocket server
    // For now, we'll simulate new notifications
    setInterval(() => {
      if (Math.random() > 0.9) { // 10% chance every 30 seconds
        this.addTestNotification()
      }
    }, 30000)
  }

  addTestNotification() {
    const notification = {
      id: Date.now(),
      channelId: 'test',
      videoId: 'test',
      title: 'Test Stream',
      message: 'Test channel is now live!',
      timestamp: new Date().toISOString(),
      read: false
    }

    this.notifications.unshift(notification)
    this.unreadCount++
    
    // Show browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Live Stream Started', {
        body: notification.message,
        icon: '/logo.png'
      })
    }

    this.render()
  }

  async handleMarkAllRead() {
    try {
      await userNotification.markAllAsRead()
      this.unreadCount = 0
      this.notifications = this.notifications.map(n => ({ ...n, read: true }))
      this.render()
    } catch (error) {
      console.error('Error marking notifications as read:', error)
    }
  }

  handleClearAll() {
    this.notifications = []
    this.unreadCount = 0
    this.render()
  }

  render() {
    this.container.innerHTML = `
      <div class="relative">
        <!-- Bell icon -->
        <button
          onclick="this.parentElement.parentElement.component.showDropdown = !this.parentElement.parentElement.component.showDropdown; this.parentElement.parentElement.component.render()"
          class="relative p-2 hover:bg-gray-700 rounded transition"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
          </svg>
          
          ${this.unreadCount > 0 ? `
            <span class="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              ${this.unreadCount > 9 ? '9+' : this.unreadCount}
            </span>
          ` : ''}
        </button>
        
        <!-- Dropdown -->
        ${this.showDropdown ? `
          <div class="fixed inset-0 z-10" onclick="this.parentElement.component.showDropdown = false; this.parentElement.component.render()"></div>
          <div class="absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-xl border border-gray-700 z-20 max-h-96 overflow-hidden flex flex-col">
            <!-- Header -->
            <div class="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
              <h3 class="font-semibold">Notifications</h3>
              ${this.notifications.length > 0 ? `
                <div class="flex gap-2">
                  ${this.unreadCount > 0 ? `
                    <button
                      onclick="this.parentElement.parentElement.parentElement.parentElement.component.handleMarkAllRead()"
                      class="text-xs text-orange-500 hover:text-orange-400"
                    >
                      Mark all read
                    </button>
                  ` : ''}
                  <button
                    onclick="this.parentElement.parentElement.parentElement.parentElement.component.handleClearAll()"
                    class="text-xs text-gray-400 hover:text-gray-300"
                  >
                    Clear all
                  </button>
                </div>
              ` : ''}
            </div>
            
            <!-- Notification list -->
            <div class="flex-1 overflow-y-auto">
              ${this.notifications.length === 0 ? `
                <div class="p-8 text-center text-gray-400">
                  <div class="text-4xl mb-2">🔔</div>
                  <p>No notifications yet</p>
                </div>
              ` : this.notifications.map(notification => `
                <div
                  class="px-4 py-3 border-b border-gray-700 hover:bg-gray-750 cursor-pointer transition ${!notification.read ? 'bg-gray-750' : ''}"
                  onclick="window.location.hash = '#/watch/${notification.videoId}'; this.parentElement.parentElement.parentElement.parentElement.component.showDropdown = false; this.parentElement.parentElement.parentElement.parentElement.component.render()"
                >
                  <div class="flex items-start gap-3">
                    ${!notification.read ? `
                      <div class="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
                    ` : ''}
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium truncate">
                        ${notification.message}
                      </p>
                      <p class="text-xs text-gray-400 mt-1">
                        ${this.formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `

    this.container.component = this

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }
}