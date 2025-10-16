// ChannelList.js - Event handling, remove functionality, improved placeholders & invalid channel highlighting
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

    this.container.innerHTML = this.channels
      .map((channel, index) => this.renderChannelItem(channel, index))
      .join('')

    this.attachEventListeners()
  }

  renderChannelItem(channel, index) {
    const status = this.liveStatus[channel.channelId]
    const isLive = status?.isLive || false
    const isActive = this.activeChannel?.channelId === channel.channelId
    const isInvalid = !channel.channelId?.startsWith('UC') || channel.channelId.length !== 24

    // ✅ Dynamic thumbnail with invalid indicator
    const placeholderSvg = `
      <svg width="48" height="48" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" fill="#374151"/>
        <text x="24" y="28" font-family="Arial" font-size="14" fill="white" text-anchor="middle">
          ${isInvalid ? '❌' : 'YT'}
        </text>
      </svg>
    `
    const thumbnailUrl =
      channel.thumbnailUrl && !channel.thumbnailUrl.includes('via.placeholder.com')
        ? channel.thumbnailUrl
        : `data:image/svg+xml;base64,${btoa(placeholderSvg)}`

    // ✅ Highlight invalid visually
    return `
      <div 
        class="channel-item flex items-center p-3 mx-2 mb-2 rounded transition ${
          isInvalid
            ? 'border border-red-500 bg-red-500/10 opacity-80 cursor-not-allowed'
            : 'cursor-pointer bg-gray-750 hover:bg-gray-700'
        } ${isActive ? 'ring-2 ring-orange-500 bg-gray-700' : ''}"
        data-channel-id="${channel.channelId}"
        data-index="${index}"
      >
        <!-- Thumbnail -->
        <div class="relative flex-shrink-0">
          <img
            src="${thumbnailUrl}"
            alt="${this.escapeHtml(channel.channelTitle)}"
            class="w-12 h-12 rounded-full object-cover"
          />
          ${isLive && !isInvalid ? `
            <div class="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border-2 border-gray-800 animate-pulse"></div>
          ` : ''}
        </div>

        <!-- Channel info -->
        <div class="ml-3 flex-1 min-w-0">
          <div class="font-semibold text-sm truncate ${isInvalid ? 'text-red-300' : 'text-white'}">
            ${this.escapeHtml(channel.channelTitle)}${isInvalid ? ' (Invalid)' : ''}
          </div>
          ${isInvalid ? `
            <div class="text-xs text-gray-400 mt-0.5">Invalid channel ID</div>
          ` : isLive && status?.title ? `
            <div class="text-xs text-gray-300 truncate mt-0.5">🔴 ${this.escapeHtml(status.title)}</div>
          ` : `
            <div class="text-xs text-gray-400 mt-0.5">${status?.isLive ? '🔴 Live' : 'Offline'}</div>
          `}
          ${isLive && status?.viewerCount && !isInvalid ? `
            <div class="text-xs text-orange-400 mt-0.5">
              ${this.formatViewerCount(status.viewerCount)} watching
            </div>
          ` : ''}
        </div>

        <!-- Remove button -->
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
    this.container.querySelectorAll('.channel-item').forEach(item => {
      const channelId = item.dataset.channelId
      const channel = this.channels.find(ch => ch.channelId === channelId)
      const isInvalid = !channel.channelId?.startsWith('UC') || channel.channelId.length !== 24

      // Prevent selection for invalid channels
      if (isInvalid) {
        item.style.cursor = 'not-allowed'
        item.addEventListener('click', e => e.preventDefault())
        return
      }

      // Channel selection
      item.addEventListener('click', (e) => {
        if (e.target.closest('.remove-btn')) return
        if (channel && this.onChannelSelect) {
          console.log('[ChannelList] Channel clicked:', channel.channelTitle)
          this.onChannelSelect(channel)
        }
      })
    })

    // Remove channel buttons
    if (this.onRemoveChannel) {
      this.container.querySelectorAll('.remove-btn').forEach(btn => {
        const channelId = btn.dataset.channelId
        btn.addEventListener('click', (e) => {
          e.stopPropagation()
          const channel = this.channels.find(ch => ch.channelId === channelId)
          if (channel) {
            const confirmed = confirm(`Remove "${channel.channelTitle}"?\n\nThis will stop tracking this channel's live streams.`)
            if (confirmed) {
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
