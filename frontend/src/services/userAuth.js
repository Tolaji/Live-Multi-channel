class UserAuth {
  async getStoredAPIKey() {
    return localStorage.getItem('youtube-api-key')
  }

  async storeAPIKey(apiKey) {
    localStorage.setItem('youtube-api-key', apiKey)
  }

  async clearAPIKey() {
    localStorage.removeItem('youtube-api-key')
  }

  async validateAPIKey(apiKey) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=dQw4w9WgXcQ&key=${apiKey}`
      )
      return response.ok
    } catch {
      return false
    }
  }
}

export const userAuth = new UserAuth()