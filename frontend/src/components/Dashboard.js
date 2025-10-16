// Dashboard.js - Complete rewrite with proper data flow
import { io } from 'socket.io-client';
import apiClient from '../services/apiClients.js'
import { Sidebar } from './Sidebar.js'
import { LivePlayer } from './LivePlayer.js'
import { NotificationBell } from './NotificationBell.js'
import { toast } from './Toast.js'
import { rssClient } from '../services/rssClient.js'


export class Dashboard {
  constructor() {
    this.channels = []
    this.activeChannel = null
    this.activeVideoId = null
    this.loading = true
    this.showChat = false
    this.liveStatus = {}
    this.statusLoading = false
    this.sidebar = null
    this.pollInterval = null
    // In Dashboard constructor
    this.socket = io(apiClient.backendUrl)
    this.socket.on('channel-live', (data) => {
      this.liveStatus[data.channelId] = data.status
      this.render()
    })
  }

  async mount(container) {
    if (!container) {
      console.error('[Dashboard] mount failed: container is null')
      return
    }
    this.container = container
    
    // Initial render with loading state
    this.render()
    
    // Load channels and start polling
    await this.loadChannels()
    this.startLiveStatusPolling()
    this.setupKeyboardShortcuts()
    
    // Final render with data
    this.render()
  }

  async loadChannels() {
    this.loading = true
    this.render()
    
    try {
      console.log('[Dashboard] Loading channels...')
      
      // Fetch channels based on mode
      if (apiClient.isUserKeyMode()) {
        this.channels = await apiClient.fetchSubscriptions()
      } else if (apiClient.isRSSMode()) {
        this.channels = await rssClient.fetchTrackedChannels()
      } else {
        throw new Error('No valid authentication mode')
      }
      
      console.log(`[Dashboard] Loaded ${this.channels.length} channels`)
      
      // Immediately fetch live status for all channels
      await this.refreshAllLiveStatus()
      
    } catch (error) {
      console.error('[Dashboard] loadChannels error:', error)
      toast.show(`Failed to load channels: ${error.message}`, 'error')
      this.channels = []
      this.liveStatus = {}
    } finally {
      this.loading = false
      this.render()
    }
  }

  async refreshAllLiveStatus() {
    console.log('[Dashboard] Refreshing live status for all channels...')
    
    const statusPromises = this.channels.map(async (channel) => {
      try {
        const status = await apiClient.checkChannelLiveStatus(channel.channelId)
        return { channelId: channel.channelId, status }
      } catch (error) {
        console.warn(`[Dashboard] Failed to get status for ${channel.channelTitle}:`, error)
        return { channelId: channel.channelId, status: { isLive: false } }
      }
    })
    
    const results = await Promise.all(statusPromises)
    
    // Update liveStatus object
    const newLiveStatus = {}
    results.forEach(({ channelId, status }) => {
      newLiveStatus[channelId] = status
    })
    
    // Detect newly live channels for notifications
    this.detectNewLiveChannels(newLiveStatus)
    
    this.liveStatus = newLiveStatus
    console.log('[Dashboard] Live status updated:', this.liveStatus)
    
    // Re-render to show updated status
    this.render()
  }

  detectNewLiveChannels(newLiveStatus) {
    Object.keys(newLiveStatus).forEach(channelId => {
      const wasLive = this.liveStatus[channelId]?.isLive || false
      const isNowLive = newLiveStatus[channelId]?.isLive || false
      
      if (!wasLive && isNowLive) {
        const channel = this.channels.find(ch => ch.channelId === channelId)
        if (channel) {
          console.log(`[Dashboard] ${channel.channelTitle} just went LIVE!`)
          toast.show(`🔴 ${channel.channelTitle} is now LIVE!`, 'success', 5000)
          
          // Browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Live Stream Started', {
              body: `${channel.channelTitle} is now streaming!`,
              icon: channel.thumbnailUrl
            })
          }
        }
      }
    })
  }

  startLiveStatusPolling() {
    // Poll every 2 minutes
    this.pollInterval = setInterval(() => {
      console.log('[Dashboard] Polling for live status updates...')
      this.refreshAllLiveStatus()
    }, 120000) // 2 minutes
    
    console.log('[Dashboard] Live status polling started (2 min interval)')
  }

  stopLiveStatusPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = null
      console.log('[Dashboard] Live status polling stopped')
    }
  }

  unmount() {
    this.stopLiveStatusPolling()
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
    if (this.statusLoading) return
    
    this.statusLoading = true
    this.render()
    
    toast.show('Refreshing live status...', 'info', 2000)
    
    try {
      await this.refreshAllLiveStatus()
      toast.show('Status updated!', 'success', 2000)
    } catch (error) {
      console.error('[Dashboard] Refresh failed:', error)
      toast.show('Refresh failed', 'error')
    } finally {
      this.statusLoading = false
      this.render()
    }
  }

  handleChannelSelect(channel) {
    console.log('[Dashboard] Channel selected:', channel.channelTitle)
    this.activeChannel = channel
    const status = this.liveStatus[channel.channelId]

    if (status?.isLive) {
      this.activeVideoId = status.videoId
      toast.show(`Now watching: ${status.title}`, 'info')
    } else {
      this.activeVideoId = null
      toast.show(`${channel.channelTitle} is not currently live`, 'warning')
    }

    this.render()
  }

  async handleAddChannel(channelData) {
    try {
      console.log('[Dashboard] Adding channel:', channelData)
      await rssClient.addChannel(
        channelData.channelId, 
        channelData.channelTitle, 
        channelData.thumbnailUrl
      )
      
      // Reload channels to get fresh data from backend
      await this.loadChannels()
      
      toast.show(`Added channel: ${channelData.channelTitle}`, 'success')
    } catch (error) {
      console.error('[Dashboard] handleAddChannel error:', error)
      toast.show(`Failed to add channel: ${error.message}`, 'error')
    }
  }

  async handleRemoveChannel(channelId) {
    try {
      const channel = this.channels.find(ch => ch.channelId === channelId)
      console.log('[Dashboard] Removing channel:', channel?.channelTitle)
      
      await rssClient.removeChannel(channelId)
      
      // Remove from local state
      this.channels = this.channels.filter(ch => ch.channelId !== channelId)
      delete this.liveStatus[channelId]
      
      // Clear active channel if it was removed
      if (this.activeChannel?.channelId === channelId) {
        this.activeChannel = null
        this.activeVideoId = null
      }
      
      toast.show(`Removed channel: ${channel?.channelTitle || channelId}`, 'success')
      this.render()
    } catch (error) {
      console.error('[Dashboard] handleRemoveChannel error:', error)
      toast.show(`Failed to remove channel: ${error.message}`, 'error')
    }
  }

  // In Dashboard.js handleLogout method
  async handleLogout() {
    console.log('[Dashboard] Logout initiated')
    
    try {
      this.stopLiveStatusPolling()
      
      // Clear current mode from storage
      localStorage.removeItem('preferred-mode')
      
      // Perform logout based on current mode
      if (apiClient.isRSSMode()) {
        await fetch(`${apiClient.backendUrl}/api/auth/simple-logout`, {
          method: 'POST',
          credentials: 'include'
        })
      } else if (apiClient.isUserKeyMode()) {
        await apiClient.clearStoredAPIKey()
      }
      
      // Clear all storage
      localStorage.clear()
      sessionStorage.clear()
      
      // Redirect to root to restart mode selection
      window.location.href = window.location.origin
      
    } catch (error) {
      console.error('[Dashboard] Logout error:', error)
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = window.location.origin
    }
  }

  render() {
    if (!this.container) {
      console.error('[Dashboard] render called but container is null')
      return
    }

    if (this.loading) {
      this.renderLoading()
      return
    }

    // Main layout structure
    this.container.innerHTML = `
      <div class="flex h-screen bg-gray-900 text-white">
        <!-- Sidebar -->
        <div id="dashboard-sidebar" class="w-80 bg-gray-800 border-r border-gray-700"></div>
        
        <!-- Main content area -->
        <div class="flex-1 flex flex-col">
          <!-- Header -->
          <header class="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">

            // Add to Dashboard.js render() method in header section
            <div class="flex items-center gap-3">
              <!-- Mode Switch Button -->
              <button
                id="switch-mode-btn"
                class="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm transition flex items-center gap-2"
                title="Switch authentication mode"
              >
                🔄 Switch Mode
              </button>
              
              <button
                id="refresh-btn"
                ${this.statusLoading ? 'disabled' : ''}
                class="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 text-sm transition flex items-center gap-2"
                title="Refresh live status (R)"
              >
                <span class="${this.statusLoading ? 'animate-spin' : ''}">↻</span>
                Refresh
              </button>
              <!-- ... rest of header ... -->
            </div>

            <div>
              <h1 class="text-xl font-bold">Live Multi-Channel</h1>
              <p class="text-sm text-gray-400">
                ${apiClient.isUserKeyMode() ? '🔑 Using your API key' : '📡 RSS Mode'}
                • ${this.channels.length} channels
                ${Object.values(this.liveStatus).filter(s => s.isLive).length > 0 
                  ? `• ${Object.values(this.liveStatus).filter(s => s.isLive).length} live now` 
                  : ''}
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button
                id="refresh-btn"
                ${this.statusLoading ? 'disabled' : ''}
                class="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 text-sm transition flex items-center gap-2"
                title="Refresh live status (R)"
              >
                <span class="${this.statusLoading ? 'animate-spin' : ''}">↻</span>
                Refresh
              </button>
              <div id="notification-bell"></div>
              <button
                id="logout-btn"
                class="px-3 py-2 bg-red-600 rounded hover:bg-red-700 text-sm transition"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </header>
          
          <!-- Main content -->
          <main class="flex-1 overflow-hidden">
            <div id="main-content" class="h-full"></div>
          </main>
        </div>
      </div>
    `

    // Mount components
    this.mountSidebar()
    this.mountNotificationBell()
    this.mountMainContent()
    this.attachEventListeners()
  }

  mountSidebar() {
    const sidebarContainer = document.getElementById('dashboard-sidebar')
    if (!sidebarContainer) return

    if (!this.sidebar) {
      this.sidebar = new Sidebar()
    }

    this.sidebar.channels = this.channels
    this.sidebar.liveStatus = this.liveStatus
    this.sidebar.activeChannel = this.activeChannel
    this.sidebar.onChannelSelect = (channel) => this.handleChannelSelect(channel)
    this.sidebar.onAddChannel = apiClient.isRSSMode() ? (data) => this.handleAddChannel(data) : null
    this.sidebar.onRemoveChannel = apiClient.isRSSMode() ? (id) => this.handleRemoveChannel(id) : null

    this.sidebar.mount(sidebarContainer)
  }

  mountNotificationBell() {
    const bellContainer = document.getElementById('notification-bell')
    if (bellContainer) {
      const bell = new NotificationBell()
      bell.mount(bellContainer)
    }
  }

  mountMainContent() {
    const mainContent = document.getElementById('main-content')
    if (!mainContent) return

    if (this.activeVideoId) {
      const player = new LivePlayer()
      player.videoId = this.activeVideoId
      player.channelTitle = this.activeChannel?.channelTitle
      player.showChat = this.showChat
      player.onChatToggle = (show) => {
        this.showChat = show
        this.render()
      }
      player.mount(mainContent)
    } else {
      this.renderNoStream(mainContent)
    }
  }

  attachEventListeners() {
    const refreshBtn = document.getElementById('refresh-btn')
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshStatus())
    }

    const logoutBtn = document.getElementById('logout-btn')
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout())
    }
  }

  renderNoStream(container) {
    if (this.activeChannel) {
      container.innerHTML = `
        <div class="flex items-center justify-center h-full p-8 bg-gray-850">
          <div class="text-center text-gray-400 max-w-md">
            <div class="w-24 h-24 mx-auto mb-4 rounded-full overflow-hidden border-2 border-gray-700">
              <img src="${this.activeChannel.thumbnailUrl}" alt="${this.activeChannel.channelTitle}" class="w-full h-full object-cover">
            </div>
            <h3 class="text-xl font-semibold mb-2 text-white">${this.activeChannel.channelTitle}</h3>
            <p class="mb-4">This channel is not currently live</p>
            <p class="text-sm text-gray-500">You'll be notified when they start streaming</p>
          </div>
        </div>
      `
    } else {
      container.innerHTML = `
        <div class="flex items-center justify-center h-full p-8 bg-gray-850">
          <div class="text-center text-gray-400 max-w-2xl">
            <div class="text-6xl mb-4">🎯</div>
            <h3 class="text-2xl font-semibold mb-4 text-white">Welcome to Live Multi-Channel!</h3>
            
            ${this.channels.length === 0 ? `
              <p class="mb-6 text-gray-300">Get started by adding YouTube channels to track their live streams.</p>
              
              <div class="grid md:grid-cols-2 gap-4 mt-8">
                <div class="p-6 bg-gray-800 rounded-lg text-left">
                  <h4 class="font-semibold mb-3 text-orange-500">📝 How to Add Channels:</h4>
                  <ol class="text-sm space-y-2 text-gray-300">
                    <li>1. Look for the <strong class="text-white">"+ Add Channel"</strong> button in the sidebar</li>
                    <li>2. Enter a YouTube Channel URL or ID</li>
                    <li>3. Start tracking live streams!</li>
                  </ol>
                </div>
                
                <div class="p-6 bg-gray-800 rounded-lg text-left">
                  <h4 class="font-semibold mb-3 text-green-500">🧪 Try These Channels:</h4>
                  <ul class="text-sm space-y-2">
                    <li class="text-blue-400"><strong>NASA:</strong> UCLA_DiR1FfKNvjuUpBHmylQ</li>
                    <li class="text-blue-400"><strong>SpaceX:</strong> UCtI0Hodo5o5dUb67FeUjDeA</li>
                    <li class="text-blue-400"><strong>Lofi Girl:</strong> UCSJ4gkVC6NrvII8umztf0Ow</li>
                  </ul>
                </div>
              </div>
            ` : `
              <p class="mb-4 text-gray-300">Select a channel from the sidebar to watch their live stream</p>
              <div class="text-sm text-gray-500">
                <p>💡 Tip: Press <kbd class="px-2 py-1 bg-gray-700 rounded">R</kbd> to refresh live status</p>
              </div>
            `}
          </div>
        </div>
      `
    }
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p class="text-lg">Loading your channels...</p>
          <p class="text-sm text-gray-400 mt-2">This may take a moment</p>
        </div>
      </div>
    `
  }
}