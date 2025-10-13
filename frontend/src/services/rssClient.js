class RSSClient {
  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
  }

  async initialize() {
    try {
      const response = await fetch(`${this.backendUrl}/api/auth/session`, {
        credentials: 'include'
      })
      return response.ok
    } catch {
      return false
    }
  }

  async checkChannelLiveStatus(channelId) {
    const response = await fetch(
      `${this.backendUrl}/api/channels/${channelId}/live-status`,
      { credentials: 'include' }
    )
    if (!response.ok) throw new Error('Failed to check live status')
    return await response.json()
  }

  async fetchTrackedChannels() {
    const response = await fetch(
      `${this.backendUrl}/api/channels/tracked`,
      { credentials: 'include' }
    )
    if (!response.ok) throw new Error('Failed to fetch tracked channels')
    return await response.json()
  }

  async addChannel(channelId, channelTitle, thumbnailUrl) {
    const response = await fetch(
      `${this.backendUrl}/api/channels/track`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channelId, channelTitle, thumbnailUrl })
      }
    )
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to add channel')
    }
    return await response.json()
  }

  async removeChannel(channelId) {
    const response = await fetch(
      `${this.backendUrl}/api/channels/${channelId}/untrack`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    )
    if (!response.ok) throw new Error('Failed to remove channel')
    return await response.json()
  }
}

export const rssClient = new RSSClient()