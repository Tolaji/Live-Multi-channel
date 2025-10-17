class RSSClient {
  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
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

  async extractChannelId(input) {
    if (input.startsWith('UC') && input.length === 24) {
      return input;
    }
    
    try {
      const url = new URL(input.includes('://') ? input : `https://${input}`);
      
      if (url.hostname.includes('youtube.com') || url.hostname.includes('youtu.be')) {
        if (url.pathname.startsWith('/channel/')) {
          const channelId = url.pathname.split('/channel/')[1];
          if (channelId && channelId.startsWith('UC') && channelId.length === 24) {
            return channelId;
          }
        }
        
        if (url.pathname === '/watch' && url.searchParams.get('v')) {
          throw new Error('Please provide a channel URL or ID, not a video URL');
        }
        
        if (url.pathname.startsWith('/@')) {
          throw new Error('Please provide the channel ID (starts with UC), not the username');
        }
      }
    } catch (e) {
      if (input.startsWith('UC') && input.length === 24) {
        return input;
      }
      throw new Error('Invalid channel URL or ID format');
    }
    
    throw new Error('Could not extract valid channel ID. Please use format: UCxxxxxxxxxxxxxxxxxxxx');
  }

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