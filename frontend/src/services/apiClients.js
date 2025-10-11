// services/apiClient.js

import { retrieveAPIKey } from './storage';
import { checkIfVideoIsLive, searchChannelForLiveStreams } from './userKeyService';

class APIClient {
  constructor() {
    this.mode = null; // 'user-key' or 'rss'
    this.userApiKey = null;
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
  }
  
  async initialize() {
    // Check if user has stored API key
    this.userApiKey = await retrieveAPIKey();
    
    if (this.userApiKey) {
      this.mode = 'user-key';
      console.log('[APIClient] Mode: User-owned API key');
    } else {
      // Check if user has backend session
      const response = await fetch(`${this.backendUrl}/api/auth/session`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        this.mode = 'rss';
        console.log('[APIClient] Mode: RSS service');
      } else {
        this.mode = null;
        console.log('[APIClient] Mode: Not authenticated');
      }
    }
    
    return this.mode;
  }
  
  // Unified method to check live status
  async checkChannelLiveStatus(channelId) {
    if (this.mode === 'user-key') {
      // Direct API call with user's key
      return await searchChannelForLiveStreams(channelId, this.userApiKey);
      
    } else if (this.mode === 'rss') {
      // Call backend API
      const response = await fetch(
        `${this.backendUrl}/api/channels/${channelId}/live-status`,
        { credentials: 'include' }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch live status');
      }
      
      return await response.json();
      
    } else {
      throw new Error('No authentication mode set');
    }
  }
  
  // Fetch user's subscriptions
  async fetchSubscriptions() {
    if (this.mode === 'user-key') {
      // Direct call to YouTube API
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=50&key=${this.userApiKey}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscriptions');
      }
      
      const data = await response.json();
      
      return data.items.map(item => ({
        channelId: item.snippet.resourceId.channelId,
        channelTitle: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails.default.url
      }));
      
    } else if (this.mode === 'rss') {
      // For RSS mode, user manually selects channels (no subscriptions API)
      const response = await fetch(
        `${this.backendUrl}/api/channels/tracked`,
        { credentials: 'include' }
      );
      
      return await response.json();
      
    } else {
      throw new Error('No authentication mode set');
    }
  }
  
  // Add channel to tracking (RSS mode only)
  async addChannel(channelId, channelTitle, thumbnailUrl) {
    if (this.mode !== 'rss') {
      throw new Error('Only available in RSS mode');
    }
    
    const response = await fetch(
      `${this.backendUrl}/api/channels/track`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ channelId, channelTitle, thumbnailUrl })
      }
    );
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to add channel');
    }
    
    return await response.json();
  }
  
  // Remove channel from tracking (RSS mode only)
  async removeChannel(channelId) {
    if (this.mode !== 'rss') {
      throw new Error('Only available in RSS mode');
    }
    
    const response = await fetch(
      `${this.backendUrl}/api/channels/${channelId}/untrack`,
      {
        method: 'DELETE',
        credentials: 'include'
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to remove channel');
    }
    
    return await response.json();
  }
}

export default new APIClient();