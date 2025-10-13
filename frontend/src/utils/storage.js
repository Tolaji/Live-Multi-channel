// Backend API-based storage utilities
const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'

export async function storeAPIKey(apiKey) {
  try {
    const response = await fetch(`${backendUrl}/api/user/api-key`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ apiKey })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to store API key')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to store API key:', error)
    throw error
  }
}

export async function retrieveAPIKey() {
  try {
    const response = await fetch(`${backendUrl}/api/user/api-key`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
    
    if (!response.ok) {
      // Return null if no API key is stored (404) or other error
      if (response.status === 404) {
        return null
      }
      throw new Error('Failed to retrieve API key')
    }
    
    const data = await response.json()
    return data.apiKey
  } catch (error) {
    console.error('Failed to retrieve API key:', error)
    return null
  }
}

export async function clearAPIKey() {
  try {
    const response = await fetch(`${backendUrl}/api/user/api-key`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to clear API key')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to clear API key:', error)
    throw error
  }
}

export async function getUserSettings() {
  try {
    const response = await fetch(`${backendUrl}/api/user/settings`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch user settings')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch user settings:', error)
    return null
  }
}

export async function updateUserSettings(settings) {
  try {
    const response = await fetch(`${backendUrl}/api/user/settings`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(settings)
    })
    
    if (!response.ok) {
      throw new Error('Failed to update user settings')
    }
    
    return await response.json()
  } catch (error) {
    console.error('Failed to update user settings:', error)
    throw error
  }
}