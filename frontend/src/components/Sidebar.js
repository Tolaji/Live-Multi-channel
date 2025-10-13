import { ChannelList } from './ChannelList.js'

export class Sidebar {
  constructor() {
    this.channels = []
    this.liveStatus = {}
    this.activeChannel = null
    this.onChannelSelect = null
    this.onAddChannel = null
    this.onRemoveChannel = null
    this.searchQuery = ''
    this.showAddModal = false
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
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
      <aside class="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <!-- Search -->
        <div class="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search channels..."
            value="${this.searchQuery}"
            oninput="this.parentElement.parentElement.component.searchQuery = this.value; this.parentElement.parentElement.component.render()"
            class="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        
        <!-- Channel list -->
        <div class="flex-1 overflow-y-auto">
          ${this.renderChannelSection('LIVE NOW', liveChannels, 'orange-500', true)}
          ${this.renderChannelSection('OFFLINE', offlineChannels, 'gray-400', false)}
          
          ${filteredChannels.length === 0 ? `
            <div class="p-4 text-center text-gray-400">
              ${this.searchQuery ? 'No channels match your search' : 'No channels yet'}
            </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div class="p-4 border-t border-gray-700">
          ${this.onAddChannel ? `
            <button
              onclick="this.parentElement.parentElement.component.showAddModal = true; this.parentElement.parentElement.component.render()"
              class="w-full px-4 py-2 bg-orange-500 rounded hover:bg-orange-600 font-semibold mb-2"
            >
              + Add Channel
            </button>
          ` : ''}
          
          <div class="text-xs text-gray-400 text-center">
            ${this.channels.length} channel${this.channels.length !== 1 ? 's' : ''} tracked
          </div>
        </div>
      </aside>

      ${this.showAddModal ? this.renderAddModal() : ''}
    `

    this.container.component = this

    // Mount channel lists
    this.mountChannelLists()
  }

  renderChannelSection(title, channels, color, isLive) {
    if (channels.length === 0) return ''

    return `
      <div class="p-4">
        <h3 class="text-sm font-semibold text-${color} mb-2 flex items-center">
          ${isLive ? '<span class="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>' : ''}
          ${title} (${channels.length})
        </h3>
        <div id="channel-list-${title.toLowerCase().replace(' ', '-')}"></div>
      </div>
    `
  }

  mountChannelLists() {
    const liveContainer = document.getElementById('channel-list-live-now')
    const offlineContainer = document.getElementById('channel-list-offline')

    if (liveContainer) {
      const liveChannels = this.channels.filter(ch => this.liveStatus[ch.channelId]?.isLive)
      const channelList = new ChannelList()
      channelList.mount(liveContainer)
      channelList.channels = liveChannels
      channelList.liveStatus = this.liveStatus
      channelList.activeChannel = this.activeChannel
      channelList.onChannelSelect = this.onChannelSelect
      channelList.onRemoveChannel = this.onRemoveChannel
    }

    if (offlineContainer) {
      const offlineChannels = this.channels.filter(ch => !this.liveStatus[ch.channelId]?.isLive)
      const channelList = new ChannelList()
      channelList.mount(offlineContainer)
      channelList.channels = offlineChannels
      channelList.liveStatus = this.liveStatus
      channelList.activeChannel = this.activeChannel
      channelList.onChannelSelect = this.onChannelSelect
      channelList.onRemoveChannel = this.onRemoveChannel
    }
  }

  renderAddModal() {
    return `
      <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <h2 class="text-xl font-bold mb-4">Add Channel</h2>
          <div id="add-channel-modal-content"></div>
        </div>
      </div>
    `
  }
}