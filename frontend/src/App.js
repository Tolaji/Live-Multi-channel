// frontend/src/App.js
// Fixed to work with your existing backend (api.js + auth.js)

import { Router } from './core/Router.js'
import { ModeSelector } from './components/ModeSelector.js'
import { APIKeySetup } from './components/APIKeySetup.js'
import { Dashboard } from './components/Dashboard.js'
import apiClient from './services/apiClients.js'
import { toast } from './components/Toast.js'
import { LoginScreen } from './components/LoginScreen.js'
import { ConfirmDialog } from './components/ConfirmDialog.js'

export class App {
  constructor() {
    this.mode = null
    this.loading = true
    this.initializationError = null
    this.router = new Router()
    this.dashboard = null
    this.lastMode = null
  }

  async mount(container) {
    this.container = container
    await this.initializeApp()
    this.setupRoutes()
    this.render()
  }

  async initializeApp() {
    try {
      console.log('[App] Starting application initialization...')
      
      // Load last mode preference
      this.lastMode = localStorage.getItem('lastMode')
      console.log('[App] Last mode:', this.lastMode)
      
      // Initialize API client
      this.mode = await apiClient.initialize()
      console.log('[App] Initialization completed, mode:', this.mode)
      
      // Store successful mode
      if (this.mode && this.mode !== 'login') {
        localStorage.setItem('lastMode', this.mode)
      }
      
    } catch (error) {
      console.error('[App] Initialization failed:', error)
      this.initializationError = error.message
      toast.show('Failed to initialize application', 'error')
    } finally {
      this.loading = false
    }
  }

  setupRoutes() {
    this.router.addRoute('*', () => this.handleRoute())
    this.router.start()
  }

  handleRoute() {
    this.render()
  }

  render() {
    if (this.loading) {
      this.renderLoading()
      return
    }

    if (this.initializationError) {
      this.renderError()
      return
    }

    if (!this.mode) {
      console.log('[App] No mode selected, showing ModeSelector')
      this.renderModeSelector()
    } else if (this.mode === 'setup-api-key') {
      console.log('[App] Rendering API Key Setup')
      this.renderAPIKeySetup()
    } else if (this.mode === 'login') {
      console.log('[App] Rendering Login Screen')
      this.renderLoginScreen()
    } else {
      console.log('[App] Rendering Dashboard with mode:', this.mode)
      this.renderDashboard()
    }
  }

  renderLoading() {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p>Initializing application...</p>
        </div>
      </div>
    `
  }

  renderError() {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div class="max-w-md text-center">
          <h1 class="text-2xl font-bold mb-4">Initialization Error</h1>
          <p class="text-gray-400 mb-4">Failed to initialize the application:</p>
          <p class="text-red-400 mb-6">${this.initializationError}</p>
          <button
            id="retry-button"
            class="px-4 py-2 bg-orange-500 rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    `
    const retryBtn = document.getElementById('retry-button')
    if (retryBtn) {
      retryBtn.addEventListener('click', () => window.location.reload())
    }
  }

  renderModeSelector() {
    this.container.innerHTML = '<div id="mode-selector-container"></div>'
    const modeSelectorContainer = document.getElementById('mode-selector-container')
    if (!modeSelectorContainer) {
      console.error('[App] Failed to create mode selector container')
      return
    }
    const modeSelector = new ModeSelector()
    modeSelector.lastMode = this.lastMode
    modeSelector.onModeSelected = (mode) => this.handleModeSelected(mode)
    modeSelector.mount(modeSelectorContainer)
  }

  renderAPIKeySetup() {
    this.container.innerHTML = '<div id="api-key-setup-container"></div>'
    const setupContainer = document.getElementById('api-key-setup-container')
    if (!setupContainer) {
      console.error('[App] Failed to create API key setup container')
      return
    }
    const apiKeySetup = new APIKeySetup()
    apiKeySetup.onComplete = () => this.handleAPIKeySetupComplete()
    apiKeySetup.onCancel = () => this.handleSetupCancel()
    apiKeySetup.mount(setupContainer)
  }

  renderLoginScreen() {
    this.container.innerHTML = '<div id="login-screen-container"></div>'
    const loginContainer = document.getElementById('login-screen-container')
    if (!loginContainer) {
      console.error('[App] login-screen-container not found')
      return
    }
    const loginScreen = new LoginScreen()
    loginScreen.onCancel = () => this.handleLoginCancel()
    loginScreen.mount(loginContainer)
    loginScreen.onLoginSuccess = async () => {
      this.loading = true
      this.render()
      this.mode = await apiClient.initialize()
      this.loading = false
      this.render()
    }
  }

  renderDashboard() {
    this.container.innerHTML = '<div id="dashboard-container"></div>'
    const dashboardContainer = document.getElementById('dashboard-container')
    if (!dashboardContainer) {
      console.error('[App] Failed to create dashboard container')
      return
    }
    
    dashboardContainer.component = this
    
    this.dashboard = new Dashboard()
    this.dashboard.onLogout = () => this.handleLogout()
    this.dashboard.onSwitchMode = () => this.handleSwitchMode()
    this.dashboard.mount(dashboardContainer)
  }

  handleModeSelected(selectedMode) {
    console.log('[App] Mode selected:', selectedMode)
    if (selectedMode === 'user-key') {
      this.mode = 'setup-api-key'
      this.render()
    } else if (selectedMode === 'rss') {
      this.mode = 'login'
      this.render()
    }
  }

  async handleAPIKeySetupComplete() {
    console.log('[App] API key setup completed')
    this.loading = true
    this.render()
    try {
      this.mode = await apiClient.initialize()
      if (this.mode === 'user-key') {
        localStorage.setItem('lastMode', 'user-key')
        toast.show('API key configured successfully!', 'success')
      } else {
        throw new Error('Failed to initialize with API key')
      }
    } catch (error) {
      console.error('[App] Failed to initialize after API key setup:', error)
      toast.show('Failed to initialize with API key', 'error')
      this.mode = 'setup-api-key'
    } finally {
      this.loading = false
      this.render()
    }
  }

  handleSetupCancel() {
    console.log('[App] API key setup cancelled')
    this.mode = null
    this.render()
  }

  handleLoginCancel() {
    console.log('[App] Login cancelled')
    this.mode = null
    this.render()
  }

  async handleSwitchMode() {
    console.log('[App] Switch mode requested')
    
    // Check if there's active state to preserve
    const hasActiveState = this.dashboard && (
      this.dashboard.activeVideoId || 
      this.dashboard.channels.length > 0
    )
    
    if (hasActiveState) {
      const confirmed = await ConfirmDialog.show({
        title: 'Switch Mode?',
        message: this.buildSwitchModeMessage(),
        confirmText: 'Switch Mode',
        cancelText: 'Cancel',
        type: 'warning'
      })
      
      if (!confirmed) {
        console.log('[App] Mode switch cancelled by user')
        return
      }
    }
    
    // Perform mode switch
    await this.performModeSwitch()
  }

  buildSwitchModeMessage() {
    const currentMode = this.mode === 'user-key' ? 'API Key' : 'RSS'
    const targetMode = this.mode === 'user-key' ? 'RSS' : 'API Key'
    
    let message = `You're about to switch from **${currentMode} Mode** to **${targetMode} Mode**.\n\n`
    message += `This will:\n`
    
    if (this.dashboard?.activeVideoId) {
      message += `• Stop the currently playing stream\n`
    }
    
    if (this.mode === 'rss' && this.dashboard?.channels.length > 0) {
      message += `• Your ${this.dashboard.channels.length} tracked channels will remain saved\n`
      message += `• You can return to RSS Mode anytime to access them\n`
    }
    
    if (this.mode === 'user-key') {
      message += `• Clear your API key\n`
      message += `• You'll need to re-enter it if you switch back\n`
    }
    
    return message
  }

  async performModeSwitch() {
    console.log('[App] Performing mode switch...')
    
    // Stop dashboard polling
    if (this.dashboard) {
      this.dashboard.stopLiveStatusPolling()
      this.dashboard = null
    }
    
    // Clear current mode state
    await apiClient.switchMode()
    
    // Reset app state
    this.mode = null
    this.loading = false
    
    // Show mode selector
    this.render()
    
    toast.show('Mode switched successfully', 'success')
  }

  async handleLogout() {
    console.log('[App] Logout requested')
    
    const confirmed = await ConfirmDialog.show({
      title: 'Sign Out?',
      message: 'Are you sure you want to sign out?\n\nThis will:\n• End your current session\n• Clear all local data\n• Return you to the mode selection screen\n\n**Note:** Your tracked channels (RSS mode) are saved on the server and will be restored when you sign in again.',
      confirmText: 'Sign Out',
      cancelText: 'Cancel',
      type: 'danger'
    })
    
    if (!confirmed) {
      console.log('[App] Logout cancelled by user')
      return
    }
    
    await this.performLogout()
  }

  async performLogout() {
    console.log('[App] Performing logout...')
    
    // Stop dashboard polling
    if (this.dashboard) {
      this.dashboard.stopLiveStatusPolling()
      this.dashboard = null
    }
    
    try {
      // FIXED: Use your existing auth logout endpoint
      await fetch(`${apiClient.backendUrl}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(err => console.warn('[App] Logout request failed:', err))
      
      // Clear API client state
      await apiClient.fullReset()
      
      // Keep lastMode for convenience, but clear everything else
      const lastMode = localStorage.getItem('lastMode')
      localStorage.clear()
      sessionStorage.clear()
      
      // Restore lastMode
      if (lastMode) {
        localStorage.setItem('lastMode', lastMode)
        this.lastMode = lastMode
      }
      
      // Reset app state
      this.mode = null
      this.loading = false
      this.isInitialized = false
      apiClient.mode = null
      apiClient.isInitialized = false
      
      // Show mode selector
      this.render()
      
      toast.show('Signed out successfully', 'success')
      
    } catch (error) {
      console.error('[App] Logout error:', error)
      // Emergency cleanup
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = window.location.origin
    }
  }
}