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
      
    } catch (error) {
      console.error('[UserKeyService] Initialization failed:', error)
      return false
    }
  }

  async checkChannelLiveStatus(channelId) {
    if (!this.apiKey) {
      throw new Error('No API key available')
    }

    console.log('[UserKeyService] Checking live status for channel:', channelId)

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${this.apiKey}`
    )

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'YouTube API error')
    }

    const data = await response.json()
    const liveVideo = data.items?.[0]

    if (liveVideo) {
      return {
        isLive: true,
        videoId: liveVideo.id.videoId,
        title: liveVideo.snippet.title,
        channelId: channelId,
        publishedAt: liveVideo.snippet.publishedAt,
        thumbnailUrl: liveVideo.snippet.thumbnails.medium.url
      }
    }

    return { isLive: false, channelId }
  }

  async fetchSubscriptions() {
    if (!this.apiKey) {
      throw new Error('No API key available')
    }

    console.log('[UserKeyService] Fetching YouTube subscriptions...')

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50&key=${this.apiKey}`
    )

    if (!response.ok) {
      throw new Error('Failed to fetch YouTube subscriptions')
    }

    const data = await response.json()
    console.log('[UserKeyService] Found subscriptions:', data.items?.length || 0)
    
    return data.items.map(item => ({
      channelId: item.snippet.resourceId.channelId,
      channelTitle: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails.default.url
    }))
  }

  async clearAPIKey() {
    await userAuth.clearAPIKey()
    this.apiKey = null
  }
}

export const userKeyService = new UserKeyService()