// ChannelList.js - Fixed rendering
export class ChannelList {
  constructor() {
    this.channels = [];
    this.liveStatus = {};
    this.activeChannel = null;
    this.onChannelSelect = null;
    this.onRemoveChannel = null;
  }

  mount(container) {
    this.container = container;
    this.render();
  }

  render() {
    console.log('[ChannelList] Rendering', this.channels.length, 'channels');
    
    if (!this.container) {
      console.error('[ChannelList] Container not found');
      return;
    }

    this.container.innerHTML = this.channels.map(channel => `
      <div class="channel-item" data-channel-id="${channel.channelId}">
        ${this.renderChannelItem(channel)}
      </div>
    `).join('');

    // Add event listeners
    this.container.querySelectorAll('.channel-item').forEach(item => {
      item.addEventListener('click', (e) => {
        if (!e.target.classList.contains('remove-btn')) {
          const channelId = item.dataset.channelId;
          const channel = this.channels.find(ch => ch.channelId === channelId);
          if (channel && this.onChannelSelect) {
            console.log('[ChannelList] Channel selected:', channel.channelTitle);
            this.onChannelSelect(channel);
          }
        }
      });
    });
  }

  renderChannelItem(channel) {
    const status = this.liveStatus[channel.channelId];
    const isLive = status?.isLive || false;
    const isActive = this.activeChannel?.channelId === channel.channelId;

    console.log('[ChannelList] Rendering channel:', channel.channelTitle, 'live:', isLive);

    return `
      <div class="
        flex items-center p-3 mx-2 mb-2 rounded cursor-pointer transition
        ${isActive ? 'bg-gray-700 ring-2 ring-orange-500' : 'bg-gray-750 hover:bg-gray-700'}
      ">
        <!-- Thumbnail -->
        <div class="relative flex-shrink-0">
          <img
            src="${channel.thumbnailUrl}"
            alt="${channel.channelTitle}"
            class="w-12 h-12 rounded-full"
            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjI0IiB5PSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiPllvdVR1YmU8L3RleHQ+Cjwvc3ZnPgo='"
          />
          ${isLive ? `
            <div class="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
          ` : ''}
        </div>
        
        <!-- Info -->
        <div class="ml-3 flex-1 min-w-0">
          <div class="font-semibold text-sm truncate text-white">
            ${channel.channelTitle}
          </div>
          ${isLive && status.title ? `
            <div class="text-xs text-gray-300 truncate mt-1">
              ${status.title}
            </div>
          ` : ''}
          ${isLive && status.viewerCount ? `
            <div class="text-xs text-orange-400 mt-1">
              ${status.viewerCount.toLocaleString()} watching
            </div>
          ` : ''}
        </div>
        
        <!-- Remove button -->
        ${this.onRemoveChannel ? `
          <button
            class="remove-btn ml-2 p-1 text-gray-400 hover:text-red-500 transition rounded"
            title="Remove channel"
            onclick="event.stopPropagation(); if(confirm('Remove ${channel.channelTitle}?')) { this.closest('.channel-item').component.handleRemoveChannel('${channel.channelId}') }"
          >
            ✕
          </button>
        ` : ''}
      </div>
    `;
  }

  handleRemoveChannel(channelId) {
    if (this.onRemoveChannel) {
      this.onRemoveChannel(channelId);
    }
  }
}