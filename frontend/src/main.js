import { App } from './App.js'
import { toast } from './components/Toast.js'
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
        <div id="app"></div>
        <div id="toast-container"></div>
      `

      const appEl = document.getElementById('app')
      const toastContainer = document.getElementById('toast-container')

      if (!appEl || !toastContainer) {
        throw new Error('Failed to create app structure')
      }

      // Initialize error boundary globally
      const errorBoundary = new ErrorBoundary()
      errorBoundary.mount(this.root)

      // Initialize toast system
      toast.mount(toastContainer)

      // Initialize main app
      const app = new App()
      app.mount(appEl)
      
      console.log('[Main] Application initialized successfully')
      
    } catch (error) {
      console.error('Failed to initialize application:', error)
      // Fallback rendering
      if (this.root) {
        this.root.innerHTML = `
          <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
            <div class="text-center">
              <h1 class="text-2xl font-bold mb-4">Failed to Load</h1>
              <p class="text-gray-400 mb-4">The application failed to initialize.</p>
              <p class="text-sm text-red-400 mb-6">${error.message}</p>
              <button onclick="window.location.reload()" class="px-4 py-2 bg-orange-500 rounded hover:bg-orange-600">
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