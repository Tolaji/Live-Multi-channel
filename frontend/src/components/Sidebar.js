// Sidebar.js - Simplified and bulletproof
import { ChannelList } from './ChannelList.js'
import { rssClient } from '../services/rssClient.js'

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

    // Attach event listeners AFTER render
    this.attachEventListeners()
    
    // Mount channel lists
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
    // Search input - simple approach without debouncing
    const searchInput = document.getElementById('sidebar-search')
    if (searchInput) {
      // Store reference to prevent losing focus
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value
        
        // Update filtered lists without full re-render
        this.updateFilteredLists()
      })
    }

    // Add channel button
    const addBtn = document.getElementById('add-channel-btn')
    if (addBtn) {
      addBtn.addEventListener('click', () => this.showAddChannelModal())
    }

    // Empty state add button
    const emptyAddBtn = document.getElementById('empty-add-btn')
    if (emptyAddBtn) {
      emptyAddBtn.addEventListener('click', () => this.showAddChannelModal())
    }
  }

  updateFilteredLists() {
    // Filter channels based on search
    const filteredChannels = this.channels.filter(channel =>
      channel.channelTitle.toLowerCase().includes(this.searchQuery.toLowerCase())
    )

    const liveChannels = filteredChannels.filter(channel =>
      this.liveStatus[channel.channelId]?.isLive
    )

    const offlineChannels = filteredChannels.filter(channel =>
      !this.liveStatus[channel.channelId]?.isLive
    )

    // Update only the channel lists, not the entire sidebar
    this.mountChannelLists(liveChannels, offlineChannels)
  }

  mountChannelLists(liveChannels, offlineChannels) {
    // Mount live channels
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

    // Mount offline channels
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
    // Simple modal using prompt (can be enhanced later)
    const examples = [
      'Examples:',
      '• https://www.youtube.com/@NASA',
      '• https://www.youtube.com/channel/UCxxxxxx',
      '• UCxxxxxx (just the ID)',
      '',
      'Try these test channels:',
      '• NASA: UCLA_DiR1FfKNvjuUpBHmylQ',
      '• SpaceX: UCtI0Hodo5o5dUb67FeUjDeA'
    ].join('\n')

    const input = prompt(`Enter YouTube Channel URL or ID:\n\n${examples}`)
    
    if (input && input.trim()) {
      this.processChannelInput(input.trim())
    }
  }

  // In Sidebar.js, update the processChannelInput method to be more robust:
  async processChannelInput(input) {
    try {
      // Extract channel ID using the rssClient method
      const channelId = await rssClient.extractChannelId(input);
      
      if (!channelId) {
        alert('Invalid channel URL or ID');
        return;
      }

      console.log('[Sidebar] Extracted channel ID:', channelId);

      // Create channel object with proper data
      const channelData = {
        channelId: channelId,
        channelTitle: `Channel ${channelId}`, // Backend will update this
        thumbnailUrl: null // Backend will provide proper thumbnail
      };

      // Call parent handler
      if (this.onAddChannel) {
        await this.onAddChannel(channelData);
      }
    } catch (error) {
      console.error('[Sidebar] Channel ID extraction error:', error);
      alert(`Error: ${error.message}\n\nValid examples:\n• UC_x5XG1OV2P6uZZ5FSM9Ttw\n• https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw`);
    }
  }
}