// components/Dashboard/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import LivePlayer from '../Player/LivePlayer';
import NotificationBell from '../Notifications/NotificationBell';
import apiClient from '../../services/apiClient';
import { useLiveStatus } from '../../hooks/useLiveStatus';

export default function Dashboard() {
  const [channels, setChannels] = useState([]);
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { liveStatus, loading: statusLoading, refresh } = useLiveStatus(channels);
  
  // Fetch channels on mount
  useEffect(() => {
    async function loadChannels() {
      try {
        setLoading(true);
        const fetchedChannels = await apiClient.fetchSubscriptions();
        setChannels(fetchedChannels);
      } catch (err) {
        console.error('Error loading channels:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    loadChannels();
  }, []);
  
  // Handle channel selection
  const handleChannelSelect = async (channel) => {
    setActiveChannel(channel);
    
    const status = liveStatus[channel.channelId];
    if (status?.isLive) {
      setActiveVideoId(status.videoId);
    } else {
      setActiveVideoId(null);
    }
  };
  
  // Add channel (RSS mode only)
  const handleAddChannel = async (channelData) => {
    try {
      await apiClient.addChannel(
        channelData.channelId,
        channelData.channelTitle,
        channelData.thumbnailUrl
      );
      
      setChannels(prev => [...prev, channelData]);
    } catch (err) {
      console.error('Error adding channel:', err);
      alert(err.message);
    }
  };
  
  // Remove channel (RSS mode only)
  const handleRemoveChannel = async (channelId) => {
    try {
      await apiClient.removeChannel(channelId);
      setChannels(prev => prev.filter(ch => ch.channelId !== channelId));
      
      if (activeChannel?.channelId === channelId) {
        setActiveChannel(null);
        setActiveVideoId(null);
      }
    } catch (err) {
      console.error('Error removing channel:', err);
      alert(err.message);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Loading channels...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-orange-500 rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <Sidebar
        channels={channels}
        liveStatus={liveStatus}
        activeChannel={activeChannel}
        onChannelSelect={handleChannelSelect}
        onAddChannel={apiClient.mode === 'rss' ? handleAddChannel : null}
        onRemoveChannel={apiClient.mode === 'rss' ? handleRemoveChannel : null}
        onRefresh={refresh}
        isRefreshing={statusLoading}
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
          <div>
            <h1 className="text-xl font-bold">Live Multi-Channel</h1>
            <p className="text-sm text-gray-400">
              {apiClient.mode === 'user-key' ? 'Using your API key' : 'RSS mode'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={refresh}
              disabled={statusLoading}
              className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
            >
              {statusLoading ? 'Refreshing...' : 'Refresh Status'}
            </button>
            
            <NotificationBell />
            
            <button
              onClick={() => {
                // Logout logic
                localStorage.clear();
                window.location.reload();
              }}
              className="px-3 py-1 bg-red-600 rounded hover:bg-red-700 text-sm"
            >
              Logout
            </button>
          </div>
        </header>
        
        {/* Player area */}
        <main className="flex-1 overflow-hidden">
          {activeVideoId ? (
            <LivePlayer 
              videoId={activeVideoId} 
              channelTitle={activeChannel?.channelTitle}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                {activeChannel ? (
                  <>
                    <div className="text-6xl mb-4">📺</div>
                    <p className="text-xl mb-2">{activeChannel.channelTitle}</p>
                    <p>This channel is not currently live</p>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">👈</div>
                    <p className="text-xl">Select a channel from the sidebar</p>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}