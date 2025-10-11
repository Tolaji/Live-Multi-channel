// hooks/useLiveStatus.js

import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/apiClient';
import websocketClient from '../services/websocketClient';

// hooks/useLiveStatus.js (continued)

export function useLiveStatus(channels) {
  const [liveStatus, setLiveStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check live status for all channels
  const checkAllChannels = useCallback(async () => {
    if (!channels || channels.length === 0) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const statusPromises = channels.map(channel => 
        apiClient.checkChannelLiveStatus(channel.channelId)
          .then(status => ({
            channelId: channel.channelId,
            ...status
          }))
          .catch(err => ({
            channelId: channel.channelId,
            isLive: false,
            error: err.message
          }))
      );
      
      const results = await Promise.all(statusPromises);
      
      const statusMap = results.reduce((acc, result) => {
        acc[result.channelId] = result;
        return acc;
      }, {});
      
      setLiveStatus(statusMap);
      
    } catch (err) {
      console.error('Error checking live status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [channels]);
  
  // Initial check
  useEffect(() => {
    checkAllChannels();
  }, [checkAllChannels]);
  
  // Set up polling (only in user-key mode)
  useEffect(() => {
    if (apiClient.mode !== 'user-key') return;
    
    // Poll every 5 minutes
    const interval = setInterval(() => {
      checkAllChannels();
    }, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkAllChannels]);
  
  // Set up WebSocket for RSS mode (real-time updates)
  useEffect(() => {
    if (apiClient.mode !== 'rss') return;
    
    websocketClient.connect();
    
    // Listen for live status updates
    websocketClient.on('channel:live', (data) => {
      setLiveStatus(prev => ({
        ...prev,
        [data.channelId]: {
          isLive: true,
          videoId: data.videoId,
          title: data.title,
          thumbnailUrl: data.thumbnailUrl,
          viewerCount: data.viewerCount,
          startedAt: data.startedAt
        }
      }));
    });
    
    websocketClient.on('channel:offline', (data) => {
      setLiveStatus(prev => ({
        ...prev,
        [data.channelId]: {
          isLive: false
        }
      }));
    });
    
    return () => {
      websocketClient.disconnect();
    };
  }, []);
  
  return {
    liveStatus,
    loading,
    error,
    refresh: checkAllChannels
  };
}