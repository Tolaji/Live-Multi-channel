// userAuth.js
export class UserAuth {
  async getStoredAPIKey() {
    try {
      return localStorage.getItem('youtube-api-key')
    } catch (error) {
      console.error('[UserAuth] getStoredAPIKey error:', error)
      return null
    }
  }

  async storeAPIKey(apiKey) {
    try {
      localStorage.setItem('youtube-api-key', apiKey)
      return true
    } catch (error) {
      console.error('[UserAuth] storeAPIKey error:', error)
      return false
    }
  }

  async clearAPIKey() {
    try {
      localStorage.removeItem('youtube-api-key')
      return true
    } catch (error) {
      console.error('[UserAuth] clearAPIKey error:', error)
      return false
    }
  }

  async validateAPIKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false
    }

    // A simple regex check (YouTube keys tend to be long alphanumeric + underscores/dashes)
    if (!/^[A-Za-z0-9_-]{30,}$/.test(apiKey)) {
      return false
    }

    try {
      // Try a harmless query to validate key
      const testVid = 'dQw4w9WgXcQ'
      const resp = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${testVid}&key=${apiKey}`
      )
      if (resp.status === 403 || resp.status === 400) {
        return false
      }
      return resp.ok
    } catch (err) {
      console.warn('[UserAuth] validateAPIKey fetch error:', err)
      return false
    }
  }
}

export const userAuth = new UserAuth()