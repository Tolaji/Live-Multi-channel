export class ChannelItem {
  constructor() {
    this.channel = null
    this.liveStatus = null
    this.isActive = false
    this.onClick = null
    this.onRemove = null
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
    if (!this.channel) return

    const isLive = this.liveStatus?.isLive || false
    const status = this.liveStatus

    this.container.innerHTML = `
      <div class="
        flex items-center p-3 mb-2 rounded cursor-pointer transition
        ${this.isActive ? 'bg-gray-700 ring-2 ring-orange-500' : 'bg-gray-750 hover:bg-gray-700'}
      " data-channel-id="${this.channel.channelId}">
        <!-- Thumbnail -->
        <div class="relative flex-shrink-0">
          <img
            src="${this.channel.thumbnailUrl}"
            alt="${this.channel.channelTitle}"
            class="w-12 h-12 rounded-full"
            onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjMzc0MTUxIi8+Cjx0ZXh0IHg9IjI0IiB5PSIyNiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iMTIiPllvdVR1YmU8L3RleHQ+Cjwvc3ZnPgo='"
          />
          ${isLive ? `
            <div class="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
          ` : ''}
        </div>
        
        <!-- Info -->
        <div class="ml-3 flex-1 min-w-0">
          <div class="font-semibold text-sm truncate">
            ${this.channel.channelTitle}
          </div>
          ${isLive && status?.title ? `
            <div class="text-xs text-gray-400 truncate">
              ${status.title}
            </div>
          ` : ''}
          ${isLive && status?.viewerCount ? `
            <div class="text-xs text-orange-500">
              ${status.viewerCount.toLocaleString()} watching
            </div>
          ` : ''}
        </div>
        
        <!-- Remove button (RSS mode only) -->
        ${this.onRemove ? `
          <button
            class="remove-btn ml-2 p-1 text-gray-400 hover:text-red-500 transition"
            title="Remove channel"
            data-channel-id="${this.channel.channelId}"
          >
            ✕
          </button>
        ` : ''}
      </div>
    `

    // Add event listeners
    const channelElement = this.container.querySelector(`[data-channel-id="${this.channel.channelId}"]`)
    if (channelElement) {
      channelElement.addEventListener('click', (e) => {
        if (!e.target.classList.contains('remove-btn')) {
          if (this.onClick) {
            this.onClick(this.channel)
          }
        }
      })
    }

    // Add remove button listener
    const removeBtn = this.container.querySelector('.remove-btn')
    if (removeBtn && this.onRemove) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        if (confirm(`Remove ${this.channel.channelTitle}?`)) {
          this.onRemove(this.channel.channelId)
        }
      })
    }
  }

  update(channel, liveStatus, isActive) {
    this.channel = channel
    this.liveStatus = liveStatus
    this.isActive = isActive
    this.render()
  }
}

// Alternative: Functional component style
export function createChannelItem(channel, liveStatus, isActive, onClick, onRemove) {
  const isLive = liveStatus?.isLive || false
  const status = liveStatus

  return `
    <div class="
      flex items-center p-3 mb-2 rounded cursor-pointer transition
      ${isActive ? 'bg-gray-700 ring-2 ring-orange-500' : 'bg-gray-750 hover:bg-gray-700'}
    " data-channel-id="${channel.channelId}">
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
        <div class="font-semibold text-sm truncate">
          ${channel.channelTitle}
        </div>
        ${isLive && status?.title ? `
          <div class="text-xs text-gray-400 truncate">
            ${status.title}
          </div>
        ` : ''}
        ${isLive && status?.viewerCount ? `
          <div class="text-xs text-orange-500">
            ${status.viewerCount.toLocaleString()} watching
          </div>
        ` : ''}
      </div>
      
      <!-- Remove button (RSS mode only) -->
      ${onRemove ? `
        <button
          class="remove-btn ml-2 p-1 text-gray-400 hover:text-red-500 transition"
          title="Remove channel"
          data-channel-id="${channel.channelId}"
          onclick="event.stopPropagation(); if(confirm('Remove ${channel.channelTitle}?')) { window.channelItemCallbacks.remove('${channel.channelId}') }"
        >
          ✕
        </button>
      ` : ''}
    </div>
  `
}

// Global callbacks for functional components
if (typeof window !== 'undefined') {
  window.channelItemCallbacks = {
    remove: (channelId) => {
      console.log('Remove channel:', channelId)
      // This would be set by the parent component
      if (window.channelItemRemoveCallback) {
        window.channelItemRemoveCallback(channelId)
      }
    }
  }
}