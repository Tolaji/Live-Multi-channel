import { userAuth } from './userAuth.js'

class UserKeyService {
  constructor() {
    this.apiKey = null
  }

  async initialize() {
    this.apiKey = await userAuth.getStoredAPIKey()
    if (!this.apiKey) return false

    const isValid = await userAuth.validateAPIKey(this.apiKey)
    if (!isValid) {
      await userAuth.clearAPIKey()
      return false
    }

    return true
  }

  async checkChannelLiveStatus(channelId) {
    if (!this.apiKey) throw new Error('No API key available')

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
    if (!this.apiKey) throw new Error('No API key available')

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50&key=${this.apiKey}`
    )

    if (!response.ok) throw new Error('Failed to fetch YouTube subscriptions')

    const data = await response.json()
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