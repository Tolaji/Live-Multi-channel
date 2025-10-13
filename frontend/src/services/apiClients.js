import { rssClient } from './rssClient.js'
import { userKeyService } from './userKeyService.js'

class APIClient {
  constructor() {
    this.mode = null
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    this.isInitialized = false
  }

  async initialize() {
    if (this.isInitialized) return this.mode

    try {
      // Try user key first
      const userKeyMode = await userKeyService.initialize()
      if (userKeyMode) {
        this.mode = 'user-key'
        console.log('[APIClient] Mode: User-owned API key')
        this.isInitialized = true
        return this.mode
      }

      // Try RSS mode
      const rssMode = await rssClient.initialize()
      if (rssMode) {
        this.mode = 'rss'
        console.log('[APIClient] Mode: RSS service')
        this.isInitialized = true
        return this.mode
      }

      this.isInitialized = true
      return null
    } catch (error) {
      console.error('[APIClient] Initialization failed:', error)
      this.isInitialized = false
      return null
    }
  }

  async checkChannelLiveStatus(channelId) {
    if (this.mode === 'user-key') {
      return await userKeyService.checkChannelLiveStatus(channelId)
    } else if (this.mode === 'rss') {
      return await rssClient.checkChannelLiveStatus(channelId)
    }
    throw new Error('No authentication mode available')
  }

  async fetchSubscriptions() {
    if (this.mode === 'user-key') {
      return await userKeyService.fetchSubscriptions()
    } else if (this.mode === 'rss') {
      return await rssClient.fetchTrackedChannels()
    }
    throw new Error('No authentication mode available')
  }

  async addChannel(channelId, channelTitle, thumbnailUrl) {
    if (this.mode !== 'rss') {
      throw new Error('Channel tracking only available in RSS mode')
    }
    return await rssClient.addChannel(channelId, channelTitle, thumbnailUrl)
  }

  async removeChannel(channelId) {
    if (this.mode !== 'rss') {
      throw new Error('Channel tracking only available in RSS mode')
    }
    return await rssClient.removeChannel(channelId)
  }

  isUserKeyMode() {
    return this.mode === 'user-key'
  }

  isRSSMode() {
    return this.mode === 'rss'
  }

  async clearStoredAPIKey() {
    await userKeyService.clearAPIKey()
    this.mode = null
    this.isInitialized = false
  }
}

export default new APIClient()