// components/ChannelListManager.jsx

export function exportChannels(channels) {
  const data = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    channels: channels.map(ch => ({
      channelId: ch.channelId,
      channelTitle: ch.channelTitle,
      thumbnailUrl: ch.thumbnailUrl
    }))
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `channels-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importChannels(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        if (data.version !== '1.0') {
          throw new Error('Unsupported file version');
        }
        
        resolve(data.channels);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// UI Component
export default function ChannelListManager({ onImport }) {
  const fileInputRef = useRef(null);
  
  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
      const channels = await importChannels(file);
      onImport(channels);
      alert(`Successfully imported ${channels.length} channels`);
    } catch (error) {
      alert(`Import failed: ${error.message}`);
    }
  };
  
  return (
    <div className="flex gap-2">
      <button onClick={() => exportChannels(channels)}>
        Export Channels
      </button>
      <button onClick={() => fileInputRef.current?.click()}>
        Import Channels
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
}