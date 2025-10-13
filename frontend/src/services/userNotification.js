class UserNotification {
  async getNotifications() {
    // Simulate fetching notifications from backend
    return [
      {
        id: 1,
        channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        videoId: 'dQw4w9WgXcQ',
        message: 'Test Channel is now live!',
        read: false,
        timestamp: new Date().toISOString()
      }
    ]
  }

  async markAllAsRead() {
    // Simulate marking notifications as read
    return { success: true }
  }

  async clearAll() {
    // Simulate clearing all notifications
    return { success: true }
  }
}

export const userNotification = new UserNotification()