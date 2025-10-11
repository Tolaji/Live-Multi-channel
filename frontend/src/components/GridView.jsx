// components/GridView.jsx

import React from 'react';

export default function GridView({ liveChannels, maxStreams = 4 }) {
  const [activeStreams, setActiveStreams] = React.useState([]);
  
  React.useEffect(() => {
    const streams = liveChannels
      .filter(ch => ch.isLive)
      .slice(0, maxStreams);
    setActiveStreams(streams);
  }, [liveChannels, maxStreams]);
  
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-2',
    4: 'grid-cols-2'
  }[activeStreams.length] || 'grid-cols-2';
  
  return (
    <div className={`grid ${gridClass} gap-4 h-full p-4`}>
      {activeStreams.map(stream => (
        <div key={stream.videoId} className="relative bg-black rounded overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${stream.videoId}?autoplay=1&mute=1`}
            className="w-full h-full"
            allowFullScreen
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
            <p className="text-white font-semibold">{stream.channelTitle}</p>
            <p className="text-gray-300 text-sm">{stream.title}</p>
          </div>
        </div>
      ))}
    </div>
  );
}