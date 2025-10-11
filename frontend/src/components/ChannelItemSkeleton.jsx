// components/ChannelItemSkeleton.jsx

export default function ChannelItemSkeleton() {
  return (
    <div className="flex items-center p-3 mb-2 rounded bg-gray-750 animate-pulse">
      <div className="w-12 h-12 bg-gray-600 rounded-full"></div>
      <div className="ml-3 flex-1">
        <div className="h-4 bg-gray-600 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-600 rounded w-1/2"></div>
      </div>
    </div>
  );
}

// Usage
{loading ? (
  <>
    <ChannelItemSkeleton />
    <ChannelItemSkeleton />
    <ChannelItemSkeleton />
  </>
) : (
  channels.map(channel => <ChannelItem key={channel.id} {...channel} />)
)}