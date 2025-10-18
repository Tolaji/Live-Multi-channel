// frontend/src/components/Dashboard.js
// Enhanced with Switch Mode dropdown

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
    this.onLogout = null
    this.onSwitchMode = null
    this.showModeSwitcher = false
    this.socket = null
  }

  async mount(container) {
    if (!container) {
      console.error('[Dashboard] mount failed: container is null')
      return
    }
    this.container = container
    
    this.render()
    await this.loadChannels()

    // --- Socket.io live updates (RSS mode only) ---
    if (apiClient.isRSSMode()) {
      this.socket = io(apiClient.backendUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      })

      this.socket.on('connect', () => {
        console.log('[Dashboard] Socket connected')
      })

      // Buffer for debouncing multiple events
      this._liveUpdateBuffer = {}
      this._liveUpdateTimer = null

      this.socket.on('channel-live', (data) => {
        console.log('[Dashboard] Realtime update received:', data)
        this._liveUpdateBuffer[data.channelId] = data.status

        // Debounce updates (wait 1s before applying all)
        clearTimeout(this._liveUpdateTimer)
        this._liveUpdateTimer = setTimeout(() => {
          const updates = { ...this._liveUpdateBuffer }
          this._liveUpdateBuffer = {}

          this.detectNewLiveChannels(updates)
          Object.entries(updates).forEach(([channelId, status]) => {
            this.liveStatus[channelId] = status
          })

          console.log('[Dashboard] Live status updated via socket:', updates)
          this.render()
        }, 1000)
      })

      this.socket.on('disconnect', (reason) => {
        console.log('[Dashboard] Socket disconnected:', reason)
      })
    }
    // ----------------------------------------------

    this.startLiveStatusPolling()
    this.setupKeyboardShortcuts()
    this.render()
  }


  async loadChannels() {
    this.loading = true;
    this.render();
    
    try {
      console.log('[Dashboard] Loading channels...');
      
      if (apiClient.isUserKeyMode()) {
        this.channels = await apiClient.fetchSubscriptions();
      } else if (apiClient.isRSSMode()) {
        this.channels = await rssClient.fetchTrackedChannels();
      } else {
        throw new Error('No valid authentication mode');
      }
      
      console.log(`[Dashboard] Loaded ${this.channels.length} channels`);
      
      // Clean up any invalid channels that might have been stored
      const hadInvalidChannels = this.cleanupInvalidChannels();
      if (hadInvalidChannels) {
        console.log('[Dashboard] Invalid channels were cleaned up');
      }
      
      await this.refreshAllLiveStatus();
      
    } catch (error) {
      console.error('[Dashboard] loadChannels error:', error);
      toast.show(`Failed to load channels: ${error.message}`, 'error');
      this.channels = [];
      this.liveStatus = {};
    } finally {
      this.loading = false;
      this.render();
    }
  }

  async refreshAllLiveStatus() {
    console.log('[Dashboard] Refreshing live status for all channels...')
    
    const statusPromises = this.channels.map(async (channel) => {
      // Skip invalid channel IDs (URLs instead of IDs)
      if (!channel.channelId.startsWith('UC') || channel.channelId.length !== 24) {
        console.warn(`[Dashboard] Skipping invalid channel ID: ${channel.channelId}`)
        return { channelId: channel.channelId, status: { isLive: false, error: 'Invalid channel ID' } }
      }
      
      try {
        const status = await apiClient.checkChannelLiveStatus(channel.channelId)
        return { channelId: channel.channelId, status }
      } catch (error) {
        console.warn(`[Dashboard] Failed to get status for ${channel.channelTitle}:`, error)
        return { channelId: channel.channelId, status: { isLive: false, error: error.message } }
      }
    })
    
    const results = await Promise.all(statusPromises)
    const newLiveStatus = {}
    results.forEach(({ channelId, status }) => {
      newLiveStatus[channelId] = status
    })
    
    this.detectNewLiveChannels(newLiveStatus)
    this.liveStatus = newLiveStatus
    console.log('[Dashboard] Live status updated:', this.liveStatus)
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
    this.pollInterval = setInterval(() => {
      console.log('[Dashboard] Polling for live status updates...')
      this.refreshAllLiveStatus()
    }, 120000)
    
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

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      console.log('[Dashboard] Socket disconnected on unmount')
    }

    if (this._liveUpdateTimer) {
      clearTimeout(this._liveUpdateTimer)
      this._liveUpdateTimer = null
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
        this.showModeSwitcher = false
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

  // In Dashboard.js, replace the handleAddChannel method with this:

  async handleAddChannel(channelData) {
    try {
      console.log('[Dashboard] Channel addition triggered, refreshing list...')
      
      // Simply reload the channel list
      // The Sidebar already handled the addition via rssClient.addChannelFromInput()
      await this.loadChannels()
      
    } catch (error) {
      console.error('[Dashboard] handleAddChannel error:', error)
      toast.show(`Failed to refresh channels: ${error.message}`, 'error')
    }
  }

  // In Dashboard.js, update the handleRemoveChannel method:
  async handleRemoveChannel(channelId) {
    try {
      const channel = this.channels.find(ch => ch.channelId === channelId);
      
      // Validate channel ID before attempting removal
      if (!channelId.startsWith('UC') || channelId.length !== 24) {
        console.warn('[Dashboard] Invalid channel ID format for removal:', channelId);
        
        // Remove from local state anyway to clean up invalid data
        this.channels = this.channels.filter(ch => ch.channelId !== channelId);
        delete this.liveStatus[channelId];
        
        if (this.activeChannel?.channelId === channelId) {
          this.activeChannel = null;
          this.activeVideoId = null;
        }
        
        toast.show(`Removed invalid channel: ${channel?.channelTitle || channelId}`, 'warning');
        this.render();
        return;
      }
      
      console.log('[Dashboard] Removing channel:', channel?.channelTitle);
      
      // Only call the API for valid channel IDs
      await rssClient.removeChannel(channelId);
      
      // Update local state
      this.channels = this.channels.filter(ch => ch.channelId !== channelId);
      delete this.liveStatus[channelId];
      
      if (this.activeChannel?.channelId === channelId) {
        this.activeChannel = null;
        this.activeVideoId = null;
      }
      
      toast.show(`Removed channel: ${channel?.channelTitle || channelId}`, 'success');
      this.render();
    } catch (error) {
      console.error('[Dashboard] handleRemoveChannel error:', error);
      
      // Even if API call fails, remove from local state
      this.channels = this.channels.filter(ch => ch.channelId !== channelId);
      delete this.liveStatus[channelId];
      
      if (this.activeChannel?.channelId === channelId) {
        this.activeChannel = null;
        this.activeVideoId = null;
      }
      
      toast.show(`Removed channel from local state: ${channelId?.channelTitle || channelId}`, 'warning');
      this.render();
    }
  }

  async cleanupInvalidChannels() {
    const validChannels = [];
    const invalidChannels = [];
    
    this.channels.forEach(channel => {
      if (channel.channelId.startsWith('UC') && channel.channelId.length === 24) {
        validChannels.push(channel);
      } else {
        invalidChannels.push(channel);
        console.warn('[Dashboard] Removing invalid channel ID:', channel.channelId, channel.channelTitle);
      }
    });
    
    if (invalidChannels.length > 0) {
      console.log(`[Dashboard] Cleaned up ${invalidChannels.length} invalid channels`);
      this.channels = validChannels;
      
      // Also clean up liveStatus
      invalidChannels.forEach(channel => {
        delete this.liveStatus[channel.channelId];
      });
      
      // Update active channel if it was invalid
      if (this.activeChannel && !validChannels.includes(this.activeChannel)) {
        this.activeChannel = null;
        this.activeVideoId = null;
      }
      
      return true;
    }
    
    return false;
  }

  toggleModeSwitcher() {
    this.showModeSwitcher = !this.showModeSwitcher
    this.render()
  }

  handleSwitchModeClick() {
    this.showModeSwitcher = false
    if (this.onSwitchMode) {
      this.onSwitchMode()
    }
  }

  handleLogoutClick() {
    this.showModeSwitcher = false
    if (this.onLogout) {
      this.onLogout()
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

    const currentMode = apiClient.isUserKeyMode() ? 'API Key' : 'RSS'
    const liveCount = Object.values(this.liveStatus).filter(s => s.isLive).length

    this.container.innerHTML = `
      <div class="flex h-screen bg-gray-900 text-white">
        <div id="dashboard-sidebar" class="w-80 bg-gray-800 border-r border-gray-700"></div>
        
        <div class="flex-1 flex flex-col">
          <header class="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
            <div>
              <h1 class="text-xl font-bold">Live Multi-Channel</h1>
              <p class="text-sm text-gray-400">
                ${currentMode} Mode • ${this.channels.length} channels
                ${liveCount > 0 ? `• ${liveCount} live now` : ''}
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
              
              <div class="relative">
                <button
                  id="mode-switcher-btn"
                  class="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 text-sm transition flex items-center gap-2"
                  title="Mode options"
                >
                  🔄 ${currentMode} ▼
                </button>
                
                ${this.showModeSwitcher ? `
                  <div class="absolute right-0 mt-2 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
                    <div class="px-4 py-3 border-b border-gray-700">
                      <div class="text-xs text-gray-400 uppercase font-semibold">Current Mode</div>
                      <div class="text-sm font-medium mt-1">✓ ${currentMode} Mode</div>
                    </div>
                    
                    <div class="py-2">
                      <button
                        id="switch-mode-btn"
                        class="w-full text-left px-4 py-2 hover:bg-gray-700 transition text-sm flex items-center gap-2"
                      >
                        <span>🔄</span>
                        <span>Switch to ${currentMode === 'API Key' ? 'RSS' : 'API Key'} Mode</span>
                      </button>
                    </div>
                    
                    <div class="border-t border-gray-700 py-2">
                      <button
                        id="logout-from-dropdown"
                        class="w-full text-left px-4 py-2 hover:bg-gray-700 transition text-sm flex items-center gap-2 text-red-400"
                      >
                        <span>🚪</span>
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>
          </header>
          
          <main class="flex-1 overflow-hidden">
            <div id="main-content" class="h-full"></div>
          </main>
        </div>
      </div>
    `

    // Close dropdown on outside click
    if (this.showModeSwitcher) {
      setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick.bind(this), { once: true })
      }, 0)
    }

    this.mountSidebar()
    this.mountNotificationBell()
    this.mountMainContent()
    this.attachEventListeners()
  }

  handleOutsideClick(event) {
    const dropdown = document.querySelector('.absolute.right-0.mt-2')
    const button = document.getElementById('mode-switcher-btn')
    
    if (dropdown && button && !dropdown.contains(event.target) && !button.contains(event.target)) {
      this.showModeSwitcher = false
      this.render()
    }
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

    const modeSwitcherBtn = document.getElementById('mode-switcher-btn')
    if (modeSwitcherBtn) {
      modeSwitcherBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.toggleModeSwitcher()
      })
    }

    const switchModeBtn = document.getElementById('switch-mode-btn')
    if (switchModeBtn) {
      switchModeBtn.addEventListener('click', () => this.handleSwitchModeClick())
    }

    const logoutFromDropdown = document.getElementById('logout-from-dropdown')
    if (logoutFromDropdown) {
      logoutFromDropdown.addEventListener('click', () => this.handleLogoutClick())
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