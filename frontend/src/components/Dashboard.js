import apiClient from '../services/apiClients.js'
import { Sidebar } from './Sidebar.js'
import { LivePlayer } from './LivePlayer.js'
import { NotificationBell } from './NotificationBell.js'
import { toast } from './Toast.js'

export class Dashboard {
  constructor() {
    this.channels = []
    this.activeChannel = null
    this.activeVideoId = null
    this.loading = true
    this.showChat = false
    this.liveStatus = {}
    this.statusLoading = false
  }

  async mount(container) {
    this.container = container
    await this.loadChannels()
    this.setupKeyboardShortcuts()
    this.render()
  }

  async loadChannels() {
    try {
      this.channels = await apiClient.fetchSubscriptions()
      
      if (this.channels.length === 0) {
        toast.show('No channels found. Add some channels to get started!', 'info')
      }
    } catch (error) {
      toast.show(`Failed to load channels: ${error.message}`, 'error')
    } finally {
      this.loading = false
    }
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (event) => {
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return

      if (event.key === 'r') {
        event.preventDefault()
        this.refreshStatus()
      } else if (event.key === 'c') {
        event.preventDefault()
        this.showChat = !this.showChat
        this.render()
      } else if (event.key === 'Escape') {
        this.showChat = false
        this.render()
      }
    })
  }

  async refreshStatus() {
    this.statusLoading = true
    this.render()

    // Simulate status refresh - in real app, this would make API calls
    setTimeout(() => {
      this.statusLoading = false
      this.render()
    }, 1000)
  }

  handleChannelSelect(channel) {
    this.activeChannel = channel
    const status = this.liveStatus[channel.channelId]
    
    if (status?.isLive) {
      this.activeVideoId = status.videoId
      toast.show(`Now watching: ${status.title}`, 'info')
    } else {
      this.activeVideoId = null
    }
    
    this.render()
  }

  async handleAddChannel(channelData) {
    try {
      await apiClient.addChannel(
        channelData.channelId,
        channelData.channelTitle,
        channelData.thumbnailUrl
      )
      
      this.channels.push(channelData)
      toast.show(`Added channel: ${channelData.channelTitle}`, 'success')
      this.render()
    } catch (error) {
      toast.show(`Failed to add channel: ${error.message}`, 'error')
    }
  }

  async handleRemoveChannel(channelId) {
    try {
      const channel = this.channels.find(ch => ch.channelId === channelId)
      await apiClient.removeChannel(channelId)
      this.channels = this.channels.filter(ch => ch.channelId !== channelId)
      
      if (this.activeChannel?.channelId === channelId) {
        this.activeChannel = null
        this.activeVideoId = null
      }
      
      toast.show(`Removed channel: ${channel.channelTitle}`, 'success')
      this.render()
    } catch (error) {
      toast.show(`Failed to remove channel: ${error.message}`, 'error')
    }
  }

  async handleLogout() {
    if (apiClient.isRSSMode()) {
      try {
        await fetch(`${apiClient.backendUrl}/auth/logout`, {
          method: 'POST',
          credentials: 'include'
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    } else {
      await apiClient.clearStoredAPIKey()
    }
    
    localStorage.clear()
    window.location.reload()
  }

  render() {
    if (this.loading) {
      this.renderLoading()
      return
    }

    this.container.innerHTML = `
      <div class="flex h-screen bg-gray-900 text-white">
        <div id="sidebar"></div>
        <div class="flex-1 flex flex-col">
          <header class="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
            <div>
              <h1 class="text-xl font-bold">Live Multi-Channel</h1>
              <p class="text-sm text-gray-400">
                ${apiClient.isUserKeyMode() ? 'Using your API key' : 'RSS Mode'}
                ${this.channels.length > 0 ? ` • ${this.channels.length} channels` : ''}
              </p>
            </div>
            
            <div class="flex items-center gap-3">
              <button
                onclick="this.parentElement.parentElement.parentElement.parentElement.component.refreshStatus()"
                ${this.statusLoading ? 'disabled' : ''}
                class="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 text-sm transition"
                title="Refresh status (R)"
              >
                ${this.statusLoading ? '🔄' : '↻'} Refresh
              </button>
              
              <div id="notification-bell"></div>
              
              <button
                onclick="this.parentElement.parentElement.parentElement.parentElement.component.handleLogout()"
                class="px-3 py-2 bg-red-600 rounded hover:bg-red-700 text-sm transition"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </header>
          
          <main class="flex-1 overflow-hidden">
            <div id="main-content"></div>
          </main>
        </div>
      </div>
    `

    this.container.component = this

    // Mount sidebar
    const sidebar = new Sidebar()
    sidebar.mount(document.getElementById('sidebar'))
    sidebar.channels = this.channels
    sidebar.liveStatus = this.liveStatus
    sidebar.activeChannel = this.activeChannel
    sidebar.onChannelSelect = (channel) => this.handleChannelSelect(channel)
    sidebar.onAddChannel = apiClient.isRSSMode() ? (data) => this.handleAddChannel(data) : null
    sidebar.onRemoveChannel = apiClient.isRSSMode() ? (id) => this.handleRemoveChannel(id) : null

    // Mount notification bell
    const notificationBell = new NotificationBell()
    notificationBell.mount(document.getElementById('notification-bell'))

    // Render main content
    this.renderMainContent()
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Loading your channels...</p>
        </div>
      </div>
    `
  }

  renderMainContent() {
    const mainContent = document.getElementById('main-content')
    
    if (this.activeVideoId) {
      const livePlayer = new LivePlayer()
      livePlayer.mount(mainContent)
      livePlayer.videoId = this.activeVideoId
      livePlayer.channelTitle = this.activeChannel?.channelTitle
      livePlayer.showChat = this.showChat
      livePlayer.onChatToggle = (show) => {
        this.showChat = show
        this.render()
      }
    } else {
      this.renderNoStream()
    }
  }

  renderNoStream() {
    const mainContent = document.getElementById('main-content')
    mainContent.innerHTML = `
      <div class="flex items-center justify-center h-full p-8">
        <div class="text-center text-gray-400 max-w-md">
          ${this.activeChannel ? `
            <div class="text-6xl mb-4">📺</div>
            <h3 class="text-xl font-semibold mb-2">${this.activeChannel.channelTitle}</h3>
            <p class="mb-4">This channel is not currently live</p>
            <p class="text-sm">
              ${apiClient.isRSSMode() 
                ? 'You will be notified when they go live' 
                : 'Live status updates every 5 minutes'
              }
            </p>
          ` : `
            <div class="text-6xl mb-4">👈</div>
            <h3 class="text-xl font-semibold mb-2">Select a Channel</h3>
            <p class="mb-4">Choose a channel from the sidebar to see its live status</p>
            ${this.channels.length === 0 ? `
              <div class="mt-6 p-4 bg-gray-800 rounded-lg">
                <p class="text-sm">
                  ${apiClient.isRSSMode()
                    ? 'Click "Add Channel" to start tracking channels'
                    : 'No YouTube subscriptions found'
                  }
                </p>
              </div>
            ` : ''}
          `}
        </div>
      </div>
    `
  }
}