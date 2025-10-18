// frontend/src/components/Sidebar.js
// FIXED: Use the new addChannelFromInput API

import { ChannelList } from './ChannelList.js'
import { rssClient } from '../services/rssClient.js'
import { toast } from './Toast.js'

export class Sidebar {
  constructor() {
    this.channels = []
    this.liveStatus = {}
    this.activeChannel = null
    this.onChannelSelect = null
    this.onAddChannel = null
    this.onRemoveChannel = null
    this.searchQuery = ''
  }

  mount(container) {
    if (!container) {
      console.error('[Sidebar] mount failed: container is null')
      return
    }
    this.container = container
    this.render()
  }

  render() {
    console.log('[Sidebar] Rendering with', this.channels.length, 'channels')
    
    const filteredChannels = this.channels.filter(channel =>
      channel.channelTitle.toLowerCase().includes(this.searchQuery.toLowerCase())
    )

    const liveChannels = filteredChannels.filter(channel =>
      this.liveStatus[channel.channelId]?.isLive
    )

    const offlineChannels = filteredChannels.filter(channel =>
      !this.liveStatus[channel.channelId]?.isLive
    )

    this.container.innerHTML = `
      <div class="h-full flex flex-col bg-gray-800">
        <!-- Search -->
        <div class="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search ${this.channels.length} channels..."
            value="${this.searchQuery}"
            class="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            id="sidebar-search"
          />
        </div>
        
        <!-- Channel list -->
        <div class="flex-1 overflow-y-auto custom-scrollbar">
          ${liveChannels.length > 0 ? this.renderSection('LIVE NOW', liveChannels, 'live', true) : ''}
          ${offlineChannels.length > 0 ? this.renderSection('OFFLINE', offlineChannels, 'offline', false) : ''}
          
          ${filteredChannels.length === 0 ? `
            <div class="p-8 text-center text-gray-400">
              <div class="text-4xl mb-2">🔍</div>
              <p>${this.searchQuery ? 'No channels match your search' : 'No channels yet'}</p>
              ${!this.searchQuery && this.onAddChannel ? `
                <button
                  id="empty-add-btn"
                  class="mt-4 px-4 py-2 bg-orange-500 rounded hover:bg-orange-600 transition"
                >
                  Add Your First Channel
                </button>
              ` : ''}
            </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div class="p-4 border-t border-gray-700 bg-gray-750">
          ${this.onAddChannel ? `
            <button
              id="add-channel-btn"
              class="w-full px-4 py-2 bg-orange-500 rounded hover:bg-orange-600 font-semibold transition flex items-center justify-center gap-2"
            >
              <span class="text-lg">+</span>
              Add Channel
            </button>
          ` : ''}
          
          <div class="text-xs text-gray-400 text-center mt-2">
            ${this.channels.length} channel${this.channels.length !== 1 ? 's' : ''} tracked
            ${liveChannels.length > 0 ? ` • ${liveChannels.length} live` : ''}
          </div>
        </div>
      </div>
    `

    this.attachEventListeners()
    
    requestAnimationFrame(() => {
      this.mountChannelLists(liveChannels, offlineChannels)
    })
  }

  renderSection(title, channels, id, isLive) {
    const color = isLive ? 'orange-500' : 'gray-400'
    
    return `
      <div class="border-b border-gray-700">
        <div class="px-4 py-3 bg-gray-750">
          <h3 class="text-sm font-semibold text-${color} flex items-center">
            ${isLive ? '<span class="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>' : ''}
            ${title}
            <span class="ml-2 text-xs bg-gray-700 px-2 py-0.5 rounded-full">${channels.length}</span>
          </h3>
        </div>
        <div id="channel-list-${id}" class="px-2 py-2"></div>
      </div>
    `
  }

  attachEventListeners() {
    const searchInput = document.getElementById('sidebar-search')
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value
        this.updateFilteredLists()
      })
    }

    const addBtn = document.getElementById('add-channel-btn')
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddChannelModal())
    }

    const emptyAddBtn = document.getElementById('empty-add-btn')
    if (emptyAddBtn) {
      emptyAddBtn.addEventListener('click', () => this.showAddChannelModal())
    }
  }

  updateFilteredLists() {
    const filteredChannels = this.channels.filter(channel =>
      channel.channelTitle.toLowerCase().includes(this.searchQuery.toLowerCase())
    )

    const liveChannels = filteredChannels.filter(channel =>
      this.liveStatus[channel.channelId]?.isLive
    )

    const offlineChannels = filteredChannels.filter(channel =>
      !this.liveStatus[channel.channelId]?.isLive
    )

    this.mountChannelLists(liveChannels, offlineChannels)
  }

  mountChannelLists(liveChannels, offlineChannels) {
    const liveContainer = document.getElementById('channel-list-live')
    if (liveContainer && liveChannels.length > 0) {
      const list = new ChannelList()
      list.channels = liveChannels
      list.liveStatus = this.liveStatus
      list.activeChannel = this.activeChannel
      list.onChannelSelect = this.onChannelSelect
      list.onRemoveChannel = this.onRemoveChannel
      list.mount(liveContainer)
    }

    const offlineContainer = document.getElementById('channel-list-offline')
    if (offlineContainer && offlineChannels.length > 0) {
      const list = new ChannelList()
      list.channels = offlineChannels
      list.liveStatus = this.liveStatus
      list.activeChannel = this.activeChannel
      list.onChannelSelect = this.onChannelSelect
      list.onRemoveChannel = this.onRemoveChannel
      list.mount(offlineContainer)
    }
  }

  showAddChannelModal() {
    const examples = [
      '📝 Supported formats:',
      '',
      '• Channel ID: UC_x5XG1OV2P6uZZ5FSM9Ttw',
      '• Channel URL: youtube.com/channel/UCxxxxxx',
      '• Video URL: youtube.com/watch?v=xxxxxxx',
      '',
      '🧪 Test channels:',
      '• NASA: UCLA_DiR1FfKNvjuUpBHmylQ',
      '• SpaceX: UCtI0Hodo5o5dUb67FeUjDeA',
      '• Lofi Girl: UCSJ4gkVC6NrvII8umztf0Ow'
    ].join('\n')

    const input = prompt(`Enter YouTube Channel URL, Video URL, or Channel ID:\n\n${examples}`)
    
    if (input && input.trim()) {
      this.processChannelInput(input.trim())
    }
  }

  /**
   * FIXED: Use the new addChannelFromInput API
   * This method now properly extracts and validates the channel ID
   */
  async processChannelInput(userInput) {
    try {
      console.log('[Sidebar] Processing user input:', userInput)
      
      // Show loading indicator
      toast.show('Resolving channel...', 'info', 2000)
      
      // Use the new combined API that handles extraction + addition
      const result = await rssClient.addChannelFromInput(userInput)
      
      console.log('[Sidebar] ✅ Channel added:', result)
      
      // Notify parent to refresh channel list
      if (this.onAddChannel) {
        // Just trigger a refresh, don't pass data
        // The parent (Dashboard) will call fetchTrackedChannels()
        await this.onAddChannel(null)
      }
      
      toast.show('Channel added successfully!', 'success')
      
    } catch (error) {
      console.error('[Sidebar] Channel addition error:', error)
      
      // User-friendly error messages
      let errorMessage = error.message
      
      if (errorMessage.includes('Session expired')) {
        errorMessage = '🔒 Session expired. Please refresh and login again.'
      } else if (errorMessage.includes('limit')) {
        errorMessage = '⚠️ Channel limit reached (5 max for free tier)'
      } else if (errorMessage.includes('Invalid format')) {
        errorMessage = '❌ Invalid input. Please use:\n• Channel ID (UCxxxx)\n• Channel URL\n• Video URL'
      }
      
      alert(errorMessage)
    }
  }
}