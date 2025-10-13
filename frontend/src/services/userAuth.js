class UserAuth {
  async getStoredAPIKey() {
    try {
      return localStorage.getItem('youtube-api-key')
    } catch (error) {
      console.error('Failed to get stored API key:', error)
      return null
    }
  }

  async storeAPIKey(apiKey) {
    try {
      localStorage.setItem('youtube-api-key', apiKey)
      return true
    } catch (error) {
      console.error('Failed to store API key:', error)
      return false
    }
  }

  async clearAPIKey() {
    try {
      localStorage.removeItem('youtube-api-key')
      return true
    } catch (error) {
      console.error('Failed to clear API key:', error)
      return false
    }
  }

  async validateAPIKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      return false
    }

    // Basic format validation first
    if (!/^[A-Za-z0-9_-]{39}$/.test(apiKey)) {
      return false
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${apiKey}`
      )
      
      if (response.status === 403) {
        console.warn('API key exists but lacks permissions')
        return false
      }
      
      return response.ok
    } catch (error) {
      console.warn('API key validation request failed:', error)
      return false
    }
  }
}

export const userAuth = new UserAuth()