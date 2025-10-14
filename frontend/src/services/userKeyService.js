// userKeyService.js
import { userAuth } from './userAuth.js'

class UserKeyService {
  constructor() {
    this.apiKey = null
  }

  async initialize() {
    try {
      this.apiKey = await userAuth.getStoredAPIKey()
      console.log('[UserKeyService] Stored API key found:', !!this.apiKey)
      if (!this.apiKey) {
        return false
      }
      const isValid = await userAuth.validateAPIKey(this.apiKey)
      console.log('[UserKeyService] API key validation result:', isValid)
      if (!isValid) {
        await userAuth.clearAPIKey()
        this.apiKey = null
        return false
      }
      return true
    } catch (err) {
      console.error('[UserKeyService] initialize error:', err)
      return false
    }
  }

  async fetchSubscriptions() {
    if (!this.apiKey) {
      throw new Error('No API key available')
    }
    const resp = await fetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50&key=${this.apiKey}`,
      {
        credentials: 'include'
      }
    )
    if (!resp.ok) {
      let msg = `Failed to fetch subscriptions: ${resp.statusText}`
      try {
        const errJson = await resp.json()
        if (errJson.error?.message) {
          msg = errJson.error.message
        }
      } catch {
        // Ignore JSON parse errors, fallback to default error message
      }
      throw new Error(msg)
    }
    const data = await resp.json()
    return (data.items || []).map(item => ({
      channelId: item.snippet.resourceId.channelId,
      channelTitle: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.default.url
    }))
  }

  async checkChannelLiveStatus(channelId) {
    if (!this.apiKey) {
      throw new Error('No API key available')
    }
    const resp = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${this.apiKey}`
    )
    if (!resp.ok) {
      let errMsg = `YouTube API error: ${resp.statusText}`
      try {
        const errJson = await resp.json()
        if (errJson.error?.message) {
          errMsg = errJson.error.message
        }
      } catch {
        // Ignore JSON parse errors, fallback to default error message
      }
      throw new Error(errMsg)
    }
    const data = await resp.json()
    const liveItem = (data.items || [])[0]
    if (liveItem) {
      return {
        isLive: true,
        videoId: liveItem.id.videoId,
        title: liveItem.snippet.title,
        channelId: channelId,
        publishedAt: liveItem.snippet.publishedAt,
        thumbnailUrl: liveItem.snippet.thumbnails?.medium?.url
      }
    }
    return { isLive: false, channelId }
  }

  async clearAPIKey() {
    await userAuth.clearAPIKey()
    this.apiKey = null
  }
}

export const userKeyService = new UserKeyService()