import { Router } from './core/Router.js'
import { ModeSelector } from './components/ModeSelector.js'
import { APIKeySetup } from './components/APIKeySetup.js'
import { Dashboard } from './components/Dashboard.js'
import apiClient from './services/apiClients.js'
import { toast } from './components/Toast.js'

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
      toast('Failed to initialize application', 'error')
    } finally {
      this.loading = false
    }
  }

  setupRoutes() {
    this.router.addRoute('*', () => this.handleRoute())
    this.router.start()
  }

  handleRoute() {
    if (this.loading) {
      this.renderLoading()
      return
    }

    if (this.initializationError) {
      this.renderError()
      return
    }

    if (!this.mode) {
      this.renderModeSelector()
    } else if (this.mode === 'setup-api-key') {
      this.renderAPIKeySetup()
    } else {
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
            onclick="window.location.reload()"
            class="px-4 py-2 bg-orange-500 rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    `
  }

  renderModeSelector() {
    const modeSelector = new ModeSelector()
    modeSelector.mount(this.container)
    modeSelector.onModeSelected = (mode) => this.handleModeSelected(mode)
  }

  renderAPIKeySetup() {
    const apiKeySetup = new APIKeySetup()
    apiKeySetup.mount(this.container)
    apiKeySetup.onComplete = () => this.handleAPIKeySetupComplete()
  }

  renderDashboard() {
    const dashboard = new Dashboard()
    dashboard.mount(this.container)
  }

  handleModeSelected(selectedMode) {
    if (selectedMode === 'user-key') {
      this.mode = 'setup-api-key'
      this.render()
    } else if (selectedMode === 'rss') {
      window.location.href = `${import.meta.env.VITE_BACKEND_URL}/auth/login`
    }
  }

  handleAPIKeySetupComplete() {
    this.mode = 'user-key'
    toast('API key configured successfully!', 'success')
    this.render()
  }

  render() {
    this.handleRoute()
  }
}