// services/apiKeyValidator.js

export async function validateAPIKey(apiKey) {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=${apiKey}`
    );
    
    if (!response.ok) {
      const error = await response.json();
      
      if (error.error.code === 403) {
        return { 
          valid: false, 
          error: 'API key lacks YouTube Data API v3 access' 
        };
      }
      
      if (error.error.code === 400) {
        return { 
          valid: false, 
          error: 'Invalid API key format' 
        };
      }
      
      return { 
        valid: false, 
        error: error.error.message 
      };
    }
    
    return { valid: true };
    
  } catch (error) {
    return { 
      valid: false, 
      error: 'Network error - check your connection' 
    };
  }
}