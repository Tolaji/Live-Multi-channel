export class NotificationList {
  constructor() {
    this.notifications = []
    this.onNotificationClick = null
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
    this.container.innerHTML = `
      <div class="notification-list">
        ${this.notifications.length === 0 ? `
          <div class="p-4 text-center text-gray-400">
            No notifications
          </div>
        ` : this.notifications.map(notification => `
          <div class="notification-item p-3 border-b border-gray-700 hover:bg-gray-750 cursor-pointer" data-notification-id="${notification.id}">
            <div class="flex items-start gap-3">
              ${!notification.read ? `
                <div class="w-2 h-2 bg-orange-500 rounded-full mt-1.5 flex-shrink-0"></div>
              ` : ''}
              <div class="flex-1">
                <p class="text-sm font-medium">${notification.message}</p>
                <p class="text-xs text-gray-400 mt-1">${this.formatTimestamp(notification.timestamp)}</p>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `

    // Add event listeners
    this.container.querySelectorAll('.notification-item').forEach(item => {
      item.addEventListener('click', () => {
        const notificationId = item.dataset.notificationId
        const notification = this.notifications.find(n => n.id == notificationId)
        if (notification && this.onNotificationClick) {
          this.onNotificationClick(notification)
        }
      })
    })
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
    
    return date.toLocaleDateString()
  }
}