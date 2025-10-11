// components/Dashboard/ChannelItem.jsx

import React from 'react';

export default function ChannelItem({ 
  channel, 
  liveStatus, 
  isActive, 
  onClick,
  onRemove 
}) {
  const isLive = liveStatus?.isLive || false;
  
  return (
    <div
      className={`
        flex items-center p-3 mb-2 rounded cursor-pointer transition
        ${isActive ? 'bg-gray-700 ring-2 ring-orange-500' : 'bg-gray-750 hover:bg-gray-700'}
      `}
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative flex-shrink-0">
        <img
          src={channel.thumbnailUrl}
          alt={channel.channelTitle}
          className="w-12 h-12 rounded-full"
        />
        {isLive && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
        )}
      </div>
      
      {/* Info */}
      <div className="ml-3 flex-1 min-w-0">
        <div className="font-semibold text-sm truncate">
          {channel.channelTitle}
        </div>
        {isLive && liveStatus.title && (
          <div className="text-xs text-gray-400 truncate">
            {liveStatus.title}
          </div>
        )}
        {isLive && liveStatus.viewerCount && (
          <div className="text-xs text-orange-500">
            {liveStatus.viewerCount.toLocaleString()} watching
          </div>
        )}
      </div>
      
      {/* Remove button (RSS mode only) */}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Remove ${channel.channelTitle}?`)) {
              onRemove(channel.channelId);
            }
          }}
          className="ml-2 p-1 text-gray-400 hover:text-red-500 transition"
          title="Remove channel"
        >
          ✕
        </button>
      )}
    </div>
  );
}