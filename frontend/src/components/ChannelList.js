// ChannelList.js - Fixed event handling and remove functionality
export class ChannelList {
  constructor() {
    this.channels = []
    this.liveStatus = {}
    this.activeChannel = null
    this.onChannelSelect = null
    this.onRemoveChannel = null
  }

  mount(container) {
    if (!container) {
      console.error('[ChannelList] Container not found')
      return
    }
    this.container = container
    this.render()
  }

  render() {
    console.log('[ChannelList] Rendering', this.channels.length, 'channels')
    
    if (!this.container) {
      console.error('[ChannelList] Container is null')
      return
    }

    // Render all channels
    this.container.innerHTML = this.channels
      .map((channel, index) => this.renderChannelItem(channel, index))
      .join('')

    // Attach event listeners after render
    this.attachEventListeners()
  }

  renderChannelItem(channel, index) {
    const status = this.liveStatus[channel.channelId]
    const isLive = status?.isLive || false
    const isActive = this.activeChannel?.channelId === channel.channelId

    return `
      <div 
        class="channel-item flex items-center p-3 mx-2 mb-2 rounded cursor-pointer transition
               ${isActive ? 'bg-gray-700 ring-2 ring-orange-500' : 'bg-gray-750 hover:bg-gray-700'}"
        data-channel-id="${channel.channelId}"
        data-index="${index}"
      >
        <!-- Thumbnail with live indicator -->
        <div class="relative flex-shrink-0">
          <img
            src="${channel.thumbnailUrl}"
            alt="${this.escapeHtml(channel.channelTitle)}"
            class="w-12 h-12 rounded-full object-cover"
            onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22%3E%3Crect fill=%22%23374151%22 width=%2248%22 height=%2248%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2212%22%3EYT%3C/text%3E%3C/svg%3E'"
          />
          ${isLive ? `
            <div class="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
          ` : ''}
        </div>
        
        <!-- Channel info -->
        <div class="ml-3 flex-1 min-w-0">
          <div class="font-semibold text-sm truncate text-white">
            ${this.escapeHtml(channel.channelTitle)}
          </div>
          ${isLive && status?.title ? `
            <div class="text-xs text-gray-300 truncate mt-0.5">
              🔴 ${this.escapeHtml(status.title)}
            </div>
          ` : ''}
          ${isLive && status?.viewerCount ? `
            <div class="text-xs text-orange-400 mt-0.5">
              ${this.formatViewerCount(status.viewerCount)} watching
            </div>
          ` : ''}
        </div>
        
        <!-- Remove button (RSS mode only) -->
        ${this.onRemoveChannel ? `
          <button
            class="remove-btn ml-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-600 rounded transition flex-shrink-0"
            data-channel-id="${channel.channelId}"
            title="Remove ${this.escapeHtml(channel.channelTitle)}"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        ` : ''}
      </div>
    `
  }

  attachEventListeners() {
    // Add click handlers for each channel item
    this.container.querySelectorAll('.channel-item').forEach(item => {
      const channelId = item.dataset.channelId
      
      // Channel selection (click anywhere except remove button)
      item.addEventListener('click', (e) => {
        // Don't trigger if clicking remove button
        if (e.target.closest('.remove-btn')) {
          return
        }
        
        const channel = this.channels.find(ch => ch.channelId === channelId)
        if (channel && this.onChannelSelect) {
          console.log('[ChannelList] Channel clicked:', channel.channelTitle)
          this.onChannelSelect(channel)
        }
      })
    })

    // Add remove button handlers
    if (this.onRemoveChannel) {
      this.container.querySelectorAll('.remove-btn').forEach(btn => {
        const channelId = btn.dataset.channelId
        
        btn.addEventListener('click', (e) => {
          e.stopPropagation() // Prevent channel selection
          
          const channel = this.channels.find(ch => ch.channelId === channelId)
          if (channel) {
            const confirmed = confirm(`Remove "${channel.channelTitle}"?\n\nThis will stop tracking this channel's live streams.`)
            if (confirmed && this.onRemoveChannel) {
              console.log('[ChannelList] Removing channel:', channel.channelTitle)
              this.onRemoveChannel(channelId)
            }
          }
        })
      })
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  formatViewerCount(count) {
    if (!count) return '0'
    if (count < 1000) return count.toString()
    if (count < 1000000) return `${(count / 1000).toFixed(1)}K`
    return `${(count / 1000000).toFixed(1)}M`
  }
}