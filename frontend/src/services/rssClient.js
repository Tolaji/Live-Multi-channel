class RSSClient {
  constructor() {
    // Use environment variable with fallback for production
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 
      (window.location.hostname.includes('vercel.app') 
        ? 'https://live-multi-channel.onrender.com' 
        : 'http://localhost:3000')
    this.isAuthenticated = false;
  }

  getAuthHeaders() {
    const token = localStorage.getItem('auth_token');
    return token ? {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  }

  async checkAuthentication() {
    try {
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        this.isAuthenticated = false;
        return false;
      }

      const response = await fetch(`${this.backendUrl}/auth/session`, {
        headers: this.getAuthHeaders()
      });

      if (response.ok) {
        const sessionData = await response.json();
        this.isAuthenticated = sessionData.authenticated === true;
        return this.isAuthenticated;
      }
      
      // Token invalid or expired
      if (response.status === 401) {
        localStorage.removeItem('auth_token');
        this.isAuthenticated = false;
        return false;
      }
      
      this.isAuthenticated = false;
      return false;
    } catch (error) {
      console.warn('[RSSClient] Authentication check failed:', error);
      this.isAuthenticated = false;
      return false;
    }
  }

  async initialize() {
    return await this.checkAuthentication();
  }

  async fetchTrackedChannels() {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode');
    }
    
    try {
      console.log('[RSSClient] Fetching tracked channels from:', `${this.backendUrl}/api/channels/tracked`);
      
      const resp = await fetch(`${this.backendUrl}/api/channels/tracked`, {
        headers: this.getAuthHeaders()
      });
      
      console.log('[RSSClient] Response status:', resp.status);
      
      if (!resp.ok) {
        if (resp.status === 401) {
          localStorage.removeItem('auth_token');
          throw new Error('Session expired - please login again');
        }
        
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
      throw error;
    }
  }

  /**
   * Extracts a standardized 24-char YouTube Channel ID (UC...) from various inputs.
   * Now resolves Channel ID from Video URLs using the secure backend endpoint.
   * @param {string} input - The channel URL, video URL, or bare Channel ID.
   * @returns {Promise<string>} The extracted 24-character Channel ID.
   */
  async extractChannelId(input) {
    const trimmedInput = input.trim();

    // 1. Direct ID check (fastest)
    if (trimmedInput.startsWith('UC') && trimmedInput.length === 24) {
      return trimmedInput;
    }
    
    let url;
    try {
      url = new URL(trimmedInput.includes('://') ? trimmedInput : `https://${trimmedInput}`);
      
      const videoId = url.pathname === '/watch' ? url.searchParams.get('v') : null;

      // 2. NEW LOGIC: Resolve Channel ID from a Video URL using the Backend
      if (videoId) {
          // Call the secure backend endpoint for API lookup
          const resp = await fetch(
              `${this.backendUrl}/api/channels/resolve-video-id?videoId=${videoId}`,
              { headers: this.getAuthHeaders() }
          );

          if (!resp.ok) {
              const errorData = await resp.json().catch(() => ({ error: 'Unknown backend error' }));
              throw new Error(`Failed to resolve channel from video URL: ${errorData.error}`);
          }
          
          const data = await resp.json();
          if (data.channelId) {
              return data.channelId; // SUCCESS: Channel ID retrieved via backend API
          }
          // Should not happen if backend logic is correct, but safe fallback
          throw new Error('Backend failed to return a Channel ID.');
      }
      
      // 3. Existing logic: Check for /channel/ URL
      if (url.pathname.startsWith('/channel/')) {
        const channelId = url.pathname.split('/channel/')[1];
        if (channelId && channelId.startsWith('UC') && channelId.length === 24) {
          return channelId;
        }
      }
      
      // 4. Existing logic: Reject user/handle URLs
      if (url.pathname.startsWith('/@') || url.pathname.startsWith('/user/')) {
        throw new Error('Please provide the Channel ID (UC...) or a /channel/ URL.');
      }

    } catch (e) {
        // Re-throw specific errors (like failed API call)
        if (e.message.includes('Failed to resolve')) {
             throw e;
        }
        // Fall through for generic URL parsing errors
    }
    
    // 5. Final fallback
    throw new Error('Invalid channel URL or ID format. Please use format: UCxxxxxxxxxxxxxxxxxxxx');
  }

// ... rest of the RSSClient class ...

  async addChannel(input, channelTitle = `Unknown Channel`, thumbnailUrl = null) {
    const channelId = await this.extractChannelId(input);
    
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode');
    }
    
    const resp = await fetch(`${this.backendUrl}/api/channels/track`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ channelId, channelTitle, thumbnailUrl })
    });
    
    if (!resp.ok) {
      if (resp.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Session expired - please login again');
      }
      
      let errMsg = 'Failed to add channel';
      try {
        const errJson = await resp.json();
        if (errJson.error) errMsg = errJson.error;
      } catch { 
        // Ignore JSON parse errors 
        }
      throw new Error(errMsg);
    }
    
    return await resp.json();
  }

  async removeChannel(channelId) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode');
    }
    
    const resp = await fetch(`${this.backendUrl}/api/channels/${channelId}/untrack`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });
    
    if (!resp.ok) {
      if (resp.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Session expired - please login again');
      }
      
      const text = await resp.text().catch(() => resp.statusText);
      throw new Error(`Failed to remove channel: ${text}`);
    }
    
    return await resp.json();
  }

  async checkChannelLiveStatus(channelId) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated in RSS mode');
    }
    
    const resp = await fetch(`${this.backendUrl}/api/channels/${channelId}/live-status`, {
      headers: this.getAuthHeaders()
    });
    
    if (!resp.ok) {
      if (resp.status === 401) {
        localStorage.removeItem('auth_token');
        throw new Error('Session expired - please login again');
      }
      
      const txt = await resp.text().catch(() => resp.statusText);
      throw new Error(`Failed to get live status: ${txt}`);
    }
    
    return await resp.json();
  }
}

export const rssClient = new RSSClient();