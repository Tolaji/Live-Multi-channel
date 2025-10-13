// utils/apiKeyValidator.js

export async function validateAPIKey(apiKey) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=${apiKey}`
    )
    
    if (!response.ok) {
      const errorData = await response.json()
      
      if (errorData.error?.code === 403) {
        return { 
          valid: false, 
          error: 'API key lacks YouTube Data API v3 access' 
        }
      }
      
      if (errorData.error?.code === 400) {
        return { 
          valid: false, 
          error: 'Invalid API key format' 
        }
      }
      
      return { 
        valid: false, 
        error: errorData.error?.message || 'API validation failed'
      }
    }
    
    return { valid: true }
    
  } catch (err) {
    return { 
      valid: false, 
      error: 'Network error - check your connection' 
    }
  }
}