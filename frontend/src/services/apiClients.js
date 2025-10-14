// apiClients.js
import { rssClient } from './rssClient.js'
import { userKeyService } from './userKeyService.js'

class APIClient {
  constructor() {
    this.mode = null
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    this.isInitialized = false
  }

  // apiClients.js - Enhanced initialization
  async initialize() {
    if (this.isInitialized) return this.mode
    
    console.log('[APIClient] Starting initialization...')
    
    try {
      // 1. Try user-key mode first
      const userKeyMode = await userKeyService.initialize()
      if (userKeyMode) {
        this.mode = 'user-key'
        this.isInitialized = true
        console.log('[APIClient] Mode: user-key')
        return this.mode
      }

      // 2. Check RSS mode authentication
      console.log('[APIClient] User key not available, checking RSS mode...')
      const rssAuthenticated = await rssClient.checkAuthentication()
      
      if (rssAuthenticated) {
        this.mode = 'rss'
        console.log('[APIClient] Mode: RSS (authenticated)')
      } else {
        this.mode = 'login'
        console.log('[APIClient] Mode: login required')
      }
      
      this.isInitialized = true
      return this.mode
      
    } catch (error) {
      console.error('[APIClient] Initialization failed:', error)
      this.mode = 'login' // Fallback to login on error
      this.isInitialized = true
      return this.mode
    }
  }

  async ensureInitialized() {
    if (!this.isInitialized) {
      await this.initialize()
    }
    if (!this.mode) {
      throw new Error('Application not properly initialized')
    }
  }

  async fetchSubscriptions() {
    await this.ensureInitialized()
    if (this.mode === 'user-key') {
      return await userKeyService.fetchSubscriptions()
    } else if (this.mode === 'rss') {
      return await rssClient.fetchTrackedChannels()
    }
    throw new Error('No authentication mode available')
  }

  async addChannel(channelId, channelTitle, thumbnailUrl) {
    await this.ensureInitialized()
    if (this.mode !== 'rss') {
      throw new Error('Channel tracking only available in RSS mode')
    }
    return await rssClient.addChannel(channelId, channelTitle, thumbnailUrl)
  }

  async removeChannel(channelId) {
    await this.ensureInitialized()
    if (this.mode !== 'rss') {
      throw new Error('Channel tracking only available in RSS mode')
    }
    return await rssClient.removeChannel(channelId)
  }

  async checkChannelLiveStatus(channelId) {
    await this.ensureInitialized()
    if (this.mode === 'user-key') {
      return await userKeyService.checkChannelLiveStatus(channelId)
    } else if (this.mode === 'rss') {
      return await rssClient.checkChannelLiveStatus(channelId)
    }
    throw new Error('No authentication mode available')
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
