class RSSClient {
  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    this.isAuthenticated = false
  }

  // rssClient.js - Add authentication check method
  async checkAuthentication() {
    try {
      const response = await fetch(`${this.backendUrl}/auth/session`, {
        credentials: 'include'
      })

      if (response.ok) {
        const sessionData = await response.json()
        this.isAuthenticated = sessionData.authenticated === true
        return this.isAuthenticated
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
    try {
      const response = await fetch(`${this.backendUrl}/auth/session`, {
        credentials: 'include'
      })

      if (response.ok) {
        const sessionData = await response.json()
        this.isAuthenticated = sessionData.authenticated === true
        return this.isAuthenticated
      }

      // 401 means not authenticated
      if (response.status === 401) {
        this.isAuthenticated = false
        return false
      }

      // Other error statuses => treat as unauthenticated
      this.isAuthenticated = false
      return false
    } catch (error) {
      console.warn('[RSSClient] initialize: session check failed, assuming not authenticated', error)
      this.isAuthenticated = false
      return false
    }
  }

  // rssClient.js - Enhanced error handling
  async fetchTrackedChannels() {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode');
    }
    
    try {
      console.log('[RSSClient] Fetching tracked channels from:', `${this.backendUrl}/api/channels/tracked`);
      
      const resp = await fetch(`${this.backendUrl}/api/channels/tracked`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      console.log('[RSSClient] Response status:', resp.status);
      
      if (!resp.ok) {
        let errorData;
        try {
          errorData = await resp.json();
        } catch (parseError) {
          errorData = { error: `HTTP ${resp.status}: ${resp.statusText}` };
        }
        
        console.error('[RSSClient] API error:', errorData);
        throw new Error(errorData.error || errorData.message || `HTTP ${resp.status}`);
      }
      
      const data = await resp.json();
      console.log('[RSSClient] Successfully fetched channels:', data.length || 0);
      return data;
      
    } catch (error) {
      console.error('[RSSClient] Network error:', error);
      throw new Error(`Failed to fetch tracked channels: ${error.message}`);
    }
  }

  // frontend/src/services/rssClient.js or in Sidebar.js
  async extractChannelId(input) {
    // If it's already a valid channel ID (starts with UC and 24 chars)
    if (input.startsWith('UC') && input.length === 24) {
      return input;
    }
    
    try {
      const url = new URL(input.includes('://') ? input : `https://${input}`);
      
      // Handle different YouTube URL formats
      if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
        // Channel URL format: youtube.com/channel/UC...
        if (url.pathname.startsWith('/channel/')) {
          const channelId = url.pathname.split('/channel/')[1];
          if (channelId && channelId.startsWith('UC') && channelId.length === 24) {
            return channelId;
          }
        }
        
        // Handle URL format: youtube.com/watch?v=...
        if (url.pathname === '/watch' && url.searchParams.get('v')) {
          throw new Error('Please provide a channel URL or ID, not a video URL');
        }
        
        // Handle custom URL format: youtube.com/@username
        if (url.pathname.startsWith('/@')) {
          throw new Error('Please provide the channel ID (starts with UC), not the username');
        }
      }
    } catch (e) {
      // If URL parsing fails, check if it might be a channel ID
      if (input.startsWith('UC') && input.length === 24) {
        return input;
      }
      throw new Error('Invalid channel URL or ID format');
    }
    
    throw new Error('Could not extract valid channel ID. Please use format: UCxxxxxxxxxxxxxxxxxxxx');
  }

  // Use it before adding:
  async addChannel(input, channelTitle = `Unknown Channel`, thumbnailUrl = null) {
    const channelId = await this.extractChannelId(input);
  //   // ... rest of your code
  // }

//   async addChannel(channelId, channelTitle, thumbnailUrl) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode')
    }
    const resp = await fetch(`${this.backendUrl}/api/channels/track`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channelId, channelTitle, thumbnailUrl })
    })
    if (!resp.ok) {
      let errMsg = 'Failed to add channel'
      try {
        const errJson = await resp.json()
        if (errJson.error) errMsg = errJson.error
      } catch {
        // Ignore JSON parse errors, fallback to default error message
      }
      throw new Error(errMsg)
    }
    return await resp.json()
  }

  async removeChannel(channelId) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode')
    }
    const resp = await fetch(`${this.backendUrl}/api/channels/${channelId}/untrack`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!resp.ok) {
      const text = await resp.text().catch(() => resp.statusText)
      throw new Error(`Failed to remove channel: ${text}`)
    }
    return await resp.json()
  }

  async checkChannelLiveStatus(channelId) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode')
    }
    const resp = await fetch(`${this.backendUrl}/api/channels/${channelId}/live-status`, {
      credentials: 'include'
    })
    if (!resp.ok) {
      const txt = await resp.text().catch(() => resp.statusText)
      throw new Error(`Failed to get live status: ${txt}`)
    }
    return await resp.json()
  }
}

export const rssClient = new RSSClient()
