// components/Player/LivePlayer.jsx

import React, { useState } from 'react';
import LiveChat from './LiveChat';

export default function LivePlayer({ videoId, channelTitle }) {
  const [showChat, setShowChat] = useState(false);
  
  return (
    <div className="h-full flex">
      {/* Video player */}
      <div className={`flex-1 bg-black ${showChat ? 'w-2/3' : 'w-full'}`}>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
          title={channelTitle}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        ></iframe>
        
        {/* Chat toggle button */}
        <div className="absolute bottom-4 right-4">
          <button
            onClick={() => setShowChat(!showChat)}
            className="px-4 py-2 bg-gray-800 bg-opacity-90 rounded hover:bg-opacity-100 transition"
          >
            {showChat ? 'Hide Chat' : 'Show Chat'}
          </button>
        </div>
      </div>
      
      {/* Live chat */}
      {showChat && (
        <div className="w-1/3 bg-gray-800 border-l border-gray-700">
          <LiveChat videoId={videoId} />
        </div>
      )}
    </div>
  );
}