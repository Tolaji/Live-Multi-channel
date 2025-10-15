// Dashboard.js
import apiClient from '../services/apiClients.js'
import { Sidebar } from './Sidebar.js'
import { LivePlayer } from './LivePlayer.js'
import { NotificationBell } from './NotificationBell.js'
import { toast } from './Toast.js'
import { rssClient } from '../services/rssClient.js';

export class Dashboard {
  constructor() {
    this.channels = []
    this.activeChannel = null
    this.activeVideoId = null
    this.loading = true
    this.showChat = false
    this.liveStatus = {}
    this.statusLoading = false
    this.sidebar = null;
  }

  // async mount(container) {
  //   if (!container) {
  //     console.error('[Dashboard] mount failed: container is null or undefined')
  //     return
  //   }
  //   this.container = container

  //   await this.loadChannels()
  //   this.setupKeyboardShortcuts()
  //   this.render()
  // }

  async mount(container) {
    this.container = container;
    await this.loadChannels();
    this.render();
  }

  // async loadChannels() {
  //   this.loading = true;
  //   this.render(); // Show loading state immediately
    
  //   try {
  //     this.channels = await apiClient.fetchSubscriptions();
      
  //     if (!Array.isArray(this.channels)) {
  //       console.error('[Dashboard] fetchSubscriptions returned invalid data:', this.channels);
  //       this.channels = [];
  //     }
      
  //     console.log(`[Dashboard] Loaded ${this.channels.length} channels`);
      
  //     if (this.channels.length === 0) {
  //       // This is normal for new users - show helpful message
  //       console.log('[Dashboard] No channels found - new user or no subscriptions');
  //     }
      
  //   } catch (error) {
  //     console.error('[Dashboard] loadChannels error:', error);
  //     toast.show(`Failed to load channels: ${error.message}`, 'error');
  //     this.channels = [];
  //   } finally {
  //     this.loading = false;
  //     this.render();
  //   }
  // }

  async loadChannels() {
    // Fetch tracked channels from backend
    try {
      const channels = await rssClient.fetchTrackedChannels();
      this.channels = channels;

      // Fetch live status for each channel
      this.liveStatus = {};
      await Promise.all(channels.map(async (channel) => {
        try {
          const status = await rssClient.checkChannelLiveStatus(channel.channelId);
          this.liveStatus[channel.channelId] = status;
        } catch {
          this.liveStatus[channel.channelId] = { isLive: false };
        }
      }));
    } catch (error) {
      console.error('[Dashboard] Failed to load channels:', error);
      this.channels = [];
      this.liveStatus = {};
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

    // Simulated refresh; replace with actual API calls as needed
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
      await apiClient.addChannel(channelData.channelId, channelData.channelTitle, channelData.thumbnailUrl)
      this.channels.push(channelData)
      toast.show(`Added channel: ${channelData.channelTitle}`, 'success')
      this.render()
    } catch (error) {
      console.error('[Dashboard] handleAddChannel error:', error)
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
      toast.show(`Removed channel: ${channel?.channelTitle || channelId}`, 'success')
      this.render()
    } catch (error) {
      console.error('[Dashboard] handleRemoveChannel error:', error)
      toast.show(`Failed to remove channel: ${error.message}`, 'error')
    }
  }

  async handleLogout() {
    console.log('[Dashboard] Logout initiated');
    
    try {
      // Always try to call the simple logout endpoint first
      console.log('[Dashboard] Calling simple logout endpoint');
      const response = await fetch(`${apiClient.backendUrl}/api/auth/simple-logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('[Dashboard] Backend logout successful');
      } else {
        console.warn('[Dashboard] Simple logout failed, trying auth/logout');
        
        // Fallback to the original auth logout
        try {
          await fetch(`${apiClient.backendUrl}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
          });
        } catch (fallbackError) {
          console.warn('[Dashboard] Fallback logout also failed:', fallbackError);
        }
      }
      
      // Clear API key if in user-key mode
      if (apiClient.isUserKeyMode()) {
        console.log('[Dashboard] Clearing API key for user-key mode');
        await apiClient.clearStoredAPIKey();
      }
      
      // Clear all client-side storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('[Dashboard] Client storage cleared, redirecting to home');
      
      // Redirect to home page instead of reloading
      window.location.href = window.location.origin;
      
    } catch (error) {
      console.error('[Dashboard] Logout error:', error);
      // Emergency cleanup and redirect
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = window.location.origin;
    }
  }

  // Main render method
  render() {
    // Mount sidebar
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    if (!this.sidebar) {
      this.sidebar = new Sidebar();
      this.sidebar.onChannelSelect = this.handleChannelSelect.bind(this);
      this.sidebar.onAddChannel = this.handleAddChannel.bind(this);
      this.sidebar.onRemoveChannel = this.handleRemoveChannel.bind(this);
    }

    this.sidebar.channels = this.channels;
    this.sidebar.liveStatus = this.liveStatus;
    this.sidebar.activeChannel = this.activeChannel;
    this.sidebar.mount(sidebarContainer);

    if (!this.container) {
      console.error('[Dashboard] render called but this.container is null');
      return;
    }

    if (this.loading) {
      this.renderLoading();
      return;
    }

    // Use simpler, more reliable HTML structure
    this.container.innerHTML = `
      <div class="flex h-screen bg-gray-900 text-white">
        <!-- Sidebar will be mounted here -->
        <div class="w-80 bg-gray-800 border-r border-gray-700" id="dashboard-sidebar-root"></div>
        
        <!-- Main content -->
        <div class="flex-1 flex flex-col">
          <header class="bg-gray-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
            <div>
              <h1 class="text-xl font-bold">Live Multi-Channel</h1>
              <p class="text-sm text-gray-400">
                ${apiClient.isUserKeyMode() ? 'Using your API key' : 'RSS Mode'}
                • ${this.channels.length} channels
              </p>
            </div>
            <div class="flex items-center gap-3">
              <button
                id="dashboard-refresh-btn"
                ${this.statusLoading ? 'disabled' : ''}
                class="px-3 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 text-sm transition"
                title="Refresh status (R)"
              >
                ${this.statusLoading ? '🔄' : '↻'} Refresh
              </button>
              <div id="dashboard-notification-root"></div>
              <button
                id="dashboard-logout-btn"
                class="px-3 py-2 bg-red-600 rounded hover:bg-red-700 text-sm transition"
                title="Logout"
              >
                Logout
              </button>
            </div>
          </header>
          <main class="flex-1 overflow-hidden">
            <div id="dashboard-main-root"></div>
          </main>
        </div>
      </div>
    `;

    // Mount components with proper timing
    this.mountComponents();
  }

  mountComponents() {
    // Use requestAnimationFrame for better DOM timing
    requestAnimationFrame(() => {
      this.mountSidebar();
      this.mountNotificationBell();
      this.mountEventListeners();
      this.renderMainContent();
    });
  }

  mountSidebar() {
    const sidebarRoot = document.getElementById('dashboard-sidebar-root');
    if (!sidebarRoot) {
      console.error('[Dashboard] Sidebar root not found');
      return;
    }
    
    console.log('[Dashboard] Mounting sidebar with channels:', this.channels);
    
    const sidebar = new Sidebar();
    sidebar.mount(sidebarRoot);
    sidebar.channels = this.channels;
    sidebar.liveStatus = this.liveStatus;
    sidebar.activeChannel = this.activeChannel;
    sidebar.onChannelSelect = (channel) => {
      console.log('[Dashboard] Channel selected:', channel.channelTitle);
      this.handleChannelSelect(channel);
    };
    sidebar.onAddChannel = apiClient.isRSSMode() ? (data) => this.handleAddChannel(data) : null;
    sidebar.onRemoveChannel = apiClient.isRSSMode() ? (id) => this.handleRemoveChannel(id) : null;
    
    console.log('[Dashboard] Sidebar mounted successfully');
  }
    
  mountNotificationBell() {
    const notificationRoot = document.getElementById('dashboard-notification-root');
    if (notificationRoot) {
      const notificationBell = new NotificationBell();
      notificationBell.mount(notificationRoot);
    }
  }

  mountEventListeners() {
    // Refresh button
    const refreshBtn = document.getElementById('dashboard-refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshStatus());
    }
    
    // Logout button
    const logoutBtn = document.getElementById('dashboard-logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => this.handleLogout());
    }
  }

  renderMainContent() {
    const mainRoot = document.getElementById('dashboard-main-root');
    if (!mainRoot) {
      console.error('[Dashboard] Main root not found');
      return;
    }

    if (this.activeVideoId) {
      const livePlayer = new LivePlayer();
      livePlayer.videoId = this.activeVideoId;
      livePlayer.channelTitle = this.activeChannel?.channelTitle;
      livePlayer.showChat = this.showChat;
      livePlayer.onChatToggle = (show) => {
        this.showChat = show;
        this.render();
      };
      livePlayer.mount(mainRoot);
    } else {
      this.renderNoStream(mainRoot);
    }
  }

  renderNoStream(container) {
    if (!container) return;
    
    if (this.activeChannel) {
      container.innerHTML = `
        <div class="flex items-center justify-center h-full p-8">
          <div class="text-center text-gray-400 max-w-md">
            <div class="text-6xl mb-4">📺</div>
            <h3 class="text-xl font-semibold mb-2">${this.activeChannel.channelTitle}</h3>
            <p class="mb-4">This channel is not currently live</p>
            <p class="text-sm">You will be notified when they go live</p>
          </div>
        </div>
      `;
    } else {
      // Welcome message for new users
      container.innerHTML = `
        <div class="flex items-center justify-center h-full p-8">
          <div class="text-center text-gray-400 max-w-md">
            <div class="text-6xl mb-4">🎯</div>
            <h3 class="text-xl font-semibold mb-2">Welcome to Live Multi-Channel!</h3>
            <p class="mb-6">Get started by adding your first YouTube channel to track live streams.</p>
            
            <div class="space-y-4">
              <div class="p-4 bg-gray-800 rounded-lg text-left">
                <h4 class="font-semibold mb-3 text-orange-500">How to add channels:</h4>
                <ol class="text-sm space-y-2">
                  <li>1. Look in the <strong>sidebar on the left</strong> for the "Add Channel" button</li>
                  <li>2. Click it to open the channel search</li>
                  <li>3. Enter a YouTube Channel URL or ID</li>
                  <li>4. Track up to 5 channels (free tier)</li>
                </ol>
              </div>
              
              <div class="p-4 bg-gray-800 rounded-lg text-left">
                <h4 class="font-semibold mb-2 text-green-500">Quick Test Channels:</h4>
                <p class="text-sm mb-2">Try adding these popular channels:</p>
                <ul class="text-sm space-y-1 text-blue-400">
                  <li>• <strong>Google Developers</strong> - UC_x5XG1OV2P6uZZ5FSM9Ttw</li>
                  <li>• <strong>Marques Brownlee</strong> - UCBJycsmduvYEL83R_U4JriQ</li>
                  <li>• <strong>Fireship</strong> - UCsTcErHg8oDvUnTzoqsYeNw</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      `;
    }
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

  async handleAddChannel(channelData) {
    try {
      await rssClient.addChannel(channelData.channelId, channelData.channelTitle, channelData.thumbnailUrl);
      await this.loadChannels();
      this.render();
    } catch (error) {
      alert('Failed to add channel');
    }
  }

  async handleRemoveChannel(channelId) {
    try {
      await rssClient.removeChannel(channelId);
      await this.loadChannels();
      this.render();
    } catch (error) {
      alert('Failed to remove channel');
    }
  }

  handleChannelSelect(channel) {
    this.activeChannel = channel;
    this.render();
  }
  
}
