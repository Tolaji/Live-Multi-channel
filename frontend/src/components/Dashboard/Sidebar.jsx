// components/Dashboard/Sidebar.jsx

import React, { useState } from 'react';
import ChannelItem from './ChannelItem';

export default function Sidebar({
  channels,
  liveStatus,
  activeChannel,
  onChannelSelect,
  onAddChannel,
  onRemoveChannel,
  onRefresh,
  isRefreshing
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const filteredChannels = channels.filter(channel =>
    channel.channelTitle.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const liveChannels = filteredChannels.filter(channel => 
    liveStatus[channel.channelId]?.isLive
  );
  
  const offlineChannels = filteredChannels.filter(channel =>
    !liveStatus[channel.channelId]?.isLive
  );
  
  return (
    <aside className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-gray-700">
        <input
          type="text"
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      
      {/* Channel list */}
      <div className="flex-1 overflow-y-auto">
        {/* Live channels */}
        {liveChannels.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-orange-500 mb-2 flex items-center">
              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>
              LIVE NOW ({liveChannels.length})
            </h3>
            {liveChannels.map(channel => (
              <ChannelItem
                key={channel.channelId}
                channel={channel}
                liveStatus={liveStatus[channel.channelId]}
                isActive={activeChannel?.channelId === channel.channelId}
                onClick={() => onChannelSelect(channel)}
                onRemove={onRemoveChannel}
              />
            ))}
          </div>
        )}
        
        {/* Offline channels */}
        {offlineChannels.length > 0 && (
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">
              OFFLINE ({offlineChannels.length})
            </h3>
            {offlineChannels.map(channel => (
              <ChannelItem
                key={channel.channelId}
                channel={channel}
                liveStatus={liveStatus[channel.channelId]}
                isActive={activeChannel?.channelId === channel.channelId}
                onClick={() => onChannelSelect(channel)}
                onRemove={onRemoveChannel}
              />
            ))}
          </div>
        )}
        
        {filteredChannels.length === 0 && (
          <div className="p-4 text-center text-gray-400">
            {searchQuery ? 'No channels match your search' : 'No channels yet'}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        {onAddChannel && (
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full px-4 py-2 bg-orange-500 rounded hover:bg-orange-600 font-semibold mb-2"
          >
            + Add Channel
          </button>
        )}
        
        <div className="text-xs text-gray-400 text-center">
          {channels.length} channel{channels.length !== 1 ? 's' : ''} tracked
        </div>
      </div>
      
      {/* Add Channel Modal */}
      {showAddModal && (
        <AddChannelModal
          onAdd={(channelData) => {
            onAddChannel(channelData);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </aside>
  );
}

// Add Channel Modal Component
function AddChannelModal({ onAdd, onClose }) {
  const [channelUrl, setChannelUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Extract channel ID from URL
      const channelId = extractChannelId(channelUrl);
      if (!channelId) {
        throw new Error('Invalid YouTube channel URL');
      }
      
      // Fetch channel details
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=snippet&id=${channelId}&key=${import.meta.env.VITE_YOUTUBE_API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch channel details');
      }
      
      const data = await response.json();
      if (!data.items || data.items.length === 0) {
        throw new Error('Channel not found');
      }
      
      const channel = data.items[0];
      onAdd({
        channelId: channel.id,
        channelTitle: channel.snippet.title,
        thumbnailUrl: channel.snippet.thumbnails.default.url
      });
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  function extractChannelId(url) {
    // Handle various YouTube URL formats
    const patterns = [
      /youtube\.com\/channel\/(UC[\w-]+)/,
      /youtube\.com\/@([\w-]+)/,
      /youtube\.com\/c\/([\w-]+)/,
      /youtube\.com\/user\/([\w-]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    
    // If it's just a channel ID
    if (/^UC[\w-]+$/.test(url)) return url;
    
    return null;
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Add Channel</h2>
        
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="YouTube channel URL or ID"
            value={channelUrl}
            onChange={(e) => setChannelUrl(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 rounded text-white mb-4 focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          
          {error && (
            <div className="text-red-500 text-sm mb-4">{error}</div>
          )}
          
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-orange-500 rounded hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Channel'}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 rounded hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}