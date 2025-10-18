// frontend/src/services/rssClient.js
// FIXED: Proper separation between extraction and storage

class RSSClient {
  constructor() {
    this.backendUrl = this.resolveBackendUrl()
    this.isAuthenticated = false
    console.log('[RSSClient] Backend URL:', this.backendUrl)
  }

  resolveBackendUrl() {
    if (import.meta.env.VITE_BACKEND_URL) {
      return import.meta.env.VITE_BACKEND_URL.replace(/\/$/, '')
    }
    
    const hostname = window.location.hostname
    if (hostname.includes('vercel.app') || hostname.includes('your-custom-domain.com')) {
      return 'https://live-multi-channel.onrender.com'
    }
    
    return 'http://localhost:3000'
  }

  getAuthHeaders() {
    const token = localStorage.getItem('auth_token')
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    }
  }

  async checkAuthentication() {
    try {
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        this.isAuthenticated = false
        return false
      }

      const response = await fetch(`${this.backendUrl}/auth/session`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        mode: 'cors'
      })

      if (response.ok) {
        const sessionData = await response.json()
        this.isAuthenticated = sessionData.authenticated === true
        console.log('[RSSClient]', this.isAuthenticated ? '✅ Authenticated' : '⚠️ Not authenticated')
        return this.isAuthenticated
      }
      
      if (response.status === 401) {
        localStorage.removeItem('auth_token')
        this.isAuthenticated = false
        return false
      }
      
      this.isAuthenticated = false
      return false
    } catch (error) {
      console.warn('[RSSClient] Authentication check failed:', error)
      this.isAuthenticated = false
      return false
    }
  }

  async initialize() {
    return await this.checkAuthentication()
  }

  async fetchTrackedChannels() {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode')
    }
    
    try {
      const url = `${this.backendUrl}/api/channels/tracked`
      console.log('[RSSClient] Fetching tracked channels from:', url)
      
      const resp = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        mode: 'cors'
      })
      
      console.log('[RSSClient] Response status:', resp.status)
      
      if (!resp.ok) {
        if (resp.status === 401) {
          localStorage.removeItem('auth_token')
          throw new Error('Session expired - please login again')
        }
        
        let errorData
        try {
          errorData = await resp.json()
        } catch (parseError) {
          errorData = { error: `HTTP ${resp.status}: ${resp.statusText}` }
        }
        
        console.error('[RSSClient] API error:', errorData)
        throw new Error(errorData.error || errorData.message || `HTTP ${resp.status}`)
      }
      
      const data = await resp.json()
      console.log('[RSSClient] Successfully fetched channels:', data.length || 0)
      
      // CRITICAL: Filter out any invalid channel data
      const validatedChannels = data.filter(ch => {
        const isValid = ch.channelId && 
                       ch.channelId.startsWith('UC') && 
                       ch.channelId.length === 24
        
        if (!isValid) {
          console.warn('[RSSClient] ⚠️ Filtered invalid channel:', ch.channelId, ch.channelTitle)
        }
        
        return isValid
      })
      
      if (validatedChannels.length < data.length) {
        console.warn(`[RSSClient] 🧹 Filtered ${data.length - validatedChannels.length} invalid channels`)
      }
      
      return validatedChannels
      
    } catch (error) {
      console.error('[RSSClient] fetchTrackedChannels error:', error)
      throw error
    }
  }

  /**
   * Extract and validate Channel ID from various input formats
   * This is the ONLY method that should handle resolution logic
   */
  async extractChannelId(input) {
    const trimmedInput = input.trim()

    // 1. Direct Channel ID (fastest path)
    if (trimmedInput.startsWith('UC') && trimmedInput.length === 24) {
      console.log('[RSSClient] ✅ Direct Channel ID detected:', trimmedInput)
      return trimmedInput
    }
    
    // 2. Parse as URL
    let url
    try {
      url = new URL(trimmedInput.includes('://') ? trimmedInput : `https://${trimmedInput}`)
      
      // 2a. Video URL - resolve via backend
      const videoId = url.pathname === '/watch' 
        ? url.searchParams.get('v')
        : (url.hostname === 'youtu.be' ? url.pathname.slice(1) : null)

      if (videoId) {
        console.log('[RSSClient] 🎥 Video URL detected, resolving via backend:', videoId)
        
        const resp = await fetch(
          `${this.backendUrl}/api/channels/resolve-video-id?videoId=${videoId}`,
          { 
            headers: this.getAuthHeaders(),
            credentials: 'include',
            mode: 'cors'
          }
        )

        if (!resp.ok) {
          const errorData = await resp.json().catch(() => ({ error: 'Backend resolution failed' }))
          throw new Error(`Failed to resolve channel from video: ${errorData.error}`)
        }
        
        const data = await resp.json()
        if (data.channelId) {
          console.log('[RSSClient] ✅ Resolved video to channel:', data.channelId)
          return data.channelId
        }
        
        throw new Error('Backend failed to return Channel ID')
      }
      
      // 2b. Channel URL (/channel/UCxxxx)
      if (url.pathname.startsWith('/channel/')) {
        const channelId = url.pathname.split('/channel/')[1].split('/')[0]
        if (channelId && channelId.startsWith('UC') && channelId.length === 24) {
          console.log('[RSSClient] ✅ Channel URL detected:', channelId)
          return channelId
        }
      }
      
      // 2c. Reject @handle or /user/ URLs
      if (url.pathname.startsWith('/@') || url.pathname.startsWith('/user/')) {
        throw new Error('❌ Please provide the Channel ID (UC...) or a /channel/ URL, not a handle (@username) or /user/ URL.')
      }

    } catch (e) {
      if (e.message.includes('Failed to resolve') || e.message.includes('❌')) {
        throw e
      }
    }
    
    // 3. Final fallback
    throw new Error('❌ Invalid format. Supported:\n• Channel ID: UCxxxxxxxxxxxxxxxxxxxx\n• Channel URL: youtube.com/channel/UCxxxx\n• Video URL: youtube.com/watch?v=xxxxx')
  }

  /**
   * Add channel - accepts ONLY a validated Channel ID
   * DO NOT pass raw user input here - use extractChannelId() first!
   */
  async addChannel(channelId, channelTitle = null, thumbnailUrl = null) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode')
    }
    
    // CRITICAL: Validate that channelId is already resolved
    if (!channelId || !channelId.startsWith('UC') || channelId.length !== 24) {
      console.error('[RSSClient] ❌ Invalid channel ID passed to addChannel():', channelId)
      throw new Error('Invalid channel ID format. Must be a 24-character UC string.')
    }
    
    console.log('[RSSClient] Adding channel:', channelId)
    
    const resp = await fetch(`${this.backendUrl}/api/channels/track`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      mode: 'cors',
      body: JSON.stringify({ 
        channelId, 
        channelTitle: channelTitle || `Channel ${channelId.substring(0, 8)}...`,
        thumbnailUrl 
      })
    })
    
    if (!resp.ok) {
      if (resp.status === 401) {
        localStorage.removeItem('auth_token')
        throw new Error('Session expired - please login again')
      }
      
      let errMsg = 'Failed to add channel'
      try {
        const errJson = await resp.json()
        if (errJson.error) errMsg = errJson.error
      } catch { /* Ignore parse errors */ }
      
      throw new Error(errMsg)
    }
    
    console.log('[RSSClient] ✅ Channel added successfully')
    return await resp.json()
  }

  /**
   * Helper method for UI components - combines extraction + addition
   */
  async addChannelFromInput(userInput) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode')
    }
    
    // Step 1: Extract/resolve channel ID
    const channelId = await this.extractChannelId(userInput)
    
    // Step 2: Add to backend
    return await this.addChannel(channelId, null, null)
  }

  async removeChannel(channelId) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode')
    }
    
    // Validate format before attempting removal
    if (!channelId.startsWith('UC') || channelId.length !== 24) {
      console.warn('[RSSClient] ⚠️ Skipping API call for invalid channel ID:', channelId)
      throw new Error('Invalid channel ID format')
    }
    
    console.log('[RSSClient] Removing channel:', channelId)
    
    const resp = await fetch(`${this.backendUrl}/api/channels/${channelId}/untrack`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      mode: 'cors'
    })
    
    if (!resp.ok) {
      if (resp.status === 401) {
        localStorage.removeItem('auth_token')
        throw new Error('Session expired - please login again')
      }
      
      const text = await resp.text().catch(() => resp.statusText)
      throw new Error(`Failed to remove channel: ${text}`)
    }
    
    console.log('[RSSClient] ✅ Channel removed successfully')
    return await resp.json()
  }

  async checkChannelLiveStatus(channelId) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode')
    }
    
    // Skip invalid channel IDs
    if (!channelId.startsWith('UC') || channelId.length !== 24) {
      console.warn('[RSSClient] ⚠️ Skipping live status check for invalid ID:', channelId)
      return { isLive: false, error: 'Invalid channel ID' }
    }
    
    const resp = await fetch(`${this.backendUrl}/api/channels/${channelId}/live-status`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
      credentials: 'include',
      mode: 'cors'
    })
    
    if (!resp.ok) {
      if (resp.status === 401) {
        localStorage.removeItem('auth_token')
        throw new Error('Session expired - please login again')
      }
      
      const txt = await resp.text().catch(() => resp.statusText)
      throw new Error(`Failed to get live status: ${txt}`)
    }
    
    return await resp.json()
  }
}

export const rssClient = new RSSClient()