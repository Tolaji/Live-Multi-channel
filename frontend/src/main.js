import { App } from './App.js'
import { ToastProvider } from './components/Toast.js'
import { ErrorBoundary } from './components/ErrorBoundary.js'

class Main {
  constructor() {
    this.root = document.getElementById('root')
    if (!this.root) {
      console.error('Root element not found!')
      return
    }
    this.render()
  }

  render() {
    try {
      // Create the app structure
      this.root.innerHTML = `
        <div id="error-boundary">
          <div id="toast-provider">
            <div id="app"></div>
          </div>
        </div>
      `

      const errorBoundaryEl = document.getElementById('error-boundary')
      const toastProviderEl = document.getElementById('toast-provider')
      const appEl = document.getElementById('app')

      if (!errorBoundaryEl || !toastProviderEl || !appEl) {
        throw new Error('Failed to create app structure')
      }

      // Initialize components
      const errorBoundary = new ErrorBoundary()
      const toastProvider = new ToastProvider()
      const app = new App()

      errorBoundary.mount(errorBoundaryEl)
      toastProvider.mount(toastProviderEl)
      app.mount(appEl)
      
    } catch (error) {
      console.error('Failed to initialize application:', error)
      // Fallback rendering
      if (this.root) {
        this.root.innerHTML = `
          <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div class="text-center">
              <h1 class="text-2xl font-bold mb-4">Failed to Load</h1>
              <p class="text-gray-400">The application failed to initialize. Please refresh the page.</p>
              <button onclick="window.location.reload()" class="mt-4 px-4 py-2 bg-orange-500 rounded">
                Refresh Page
              </button>
            </div>
          </div>
        `
      }
    }
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Main()
  })
} else {
  new Main()
}