// Simple localStorage wrapper for API key storage
export async function storeAPIKey(apiKey) {
  try {
    localStorage.setItem('youtube-api-key', apiKey)
    return true
  } catch (error) {
    console.error('Failed to store API key:', error)
    return false
  }
}

export async function retrieveAPIKey() {
  try {
    return localStorage.getItem('youtube-api-key')
  } catch (error) {
    console.error('Failed to retrieve API key:', error)
    return null
  }
}

export async function clearAPIKey() {
  try {
    localStorage.removeItem('youtube-api-key')
    return true
  } catch (error) {
    console.error('Failed to clear API key:', error)
    return false
  }
}