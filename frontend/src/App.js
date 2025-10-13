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
      this.mode = await apiClient.initialize()
    } catch {
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