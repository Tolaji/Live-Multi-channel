// App.js
import { Router } from './core/Router.js'
import { ModeSelector } from './components/ModeSelector.js'
import { APIKeySetup } from './components/APIKeySetup.js'
import { Dashboard } from './components/Dashboard.js'
import apiClient from './services/apiClients.js'
import { toast } from './components/Toast.js'
import { LoginScreen } from './components/LoginScreen.js'


export class App {
  constructor() {
    this.mode = null
    this.loading = true
    this.initializationError = null
    this.router = new Router()
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
      this.mode = await apiClient.initialize()
      console.log('[App] Initialization completed, mode:', this.mode)
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
    // Always render based on current state
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
    loginScreen.mount(loginContainer)
    // Optionally you can register a callback for post-login success
    loginScreen.onLoginSuccess = async () => {
      // Re-initialize and go to dashboard
      this.loading = true
      this.render()
      this.mode = await apiClient.initialize()
      this.loading = false
      this.render()
    }
  }


  // Add renderDashboard method
  renderDashboard() {
    this.container.innerHTML = '<div id="dashboard-container"></div>'
    const dashboardContainer = document.getElementById('dashboard-container')
    if (!dashboardContainer) {
      console.error('[App] Failed to create dashboard container')
      return
    }
    
    // Store component reference immediately
    dashboardContainer.component = this
    
    const dashboard = new Dashboard()
    dashboard.mount(dashboardContainer)
  }

  handleModeSelected(selectedMode) {
    console.log('[App] Mode selected:', selectedMode)
    if (selectedMode === 'user-key') {
      this.mode = 'setup-api-key'
      this.render()
    } else if (selectedMode === 'rss') {
      // Immediately set to login mode and redirect user
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
}
