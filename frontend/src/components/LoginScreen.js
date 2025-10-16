// frontend/src/components/LoginScreen.js
// Enhanced with cancel button to return to mode selector

import { toast } from './Toast.js'

export class LoginScreen {
  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    this.loading = false
    this.onCancel = null
  }

  mount(container) {
    if (!container) {
      console.error('[LoginScreen] mount: container is null')
      return
    }
    this.container = container
    this.render()
  }

  async handleLoginClick() {
    if (this.loading) return
    this.loading = true
    this.render()
    try {
      window.location.href = `${this.backendUrl}/auth/login`
    } catch (error) {
      console.error('[LoginScreen] handleLoginClick error:', error)
      toast.show('Login failed. Please try again.', 'error')
      this.loading = false
      this.render()
    }
  }

  handleCancelClick() {
    console.log('[LoginScreen] Cancel clicked')
    if (this.onCancel) {
      this.onCancel()
    }
  }

  render() {
    if (!this.container) {
      console.error('[LoginScreen] render: container is null')
      return
    }

    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div class="max-w-md w-full text-center space-y-6">
          <div class="text-6xl mb-4">📡</div>
          <h1 class="text-3xl font-bold mb-2">Sign in to RSS Mode</h1>
          <p class="text-gray-400 mb-6">
            Sign in with your Google account to start tracking live streams via RSS notifications.
          </p>
          
          <div class="space-y-3">
            <button id="login-button"
              class="w-full py-3 px-4 bg-orange-500 rounded-lg hover:bg-orange-600 transition font-semibold text-white
                     ${this.loading ? 'opacity-50 cursor-not-allowed' : ''}"
              ${this.loading ? 'disabled' : ''}
            >
              ${this.loading ? 'Redirecting...' : '🔐 Sign in with Google'}
            </button>
            
            <button id="cancel-button"
              class="w-full py-3 px-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition font-medium text-white"
              ${this.loading ? 'disabled' : ''}
            >
              ← Back to Mode Selection
            </button>
          </div>
          
          <div class="mt-6 p-4 bg-gray-800 rounded-lg text-left text-sm">
            <h3 class="font-semibold mb-2 text-orange-500">What you'll get:</h3>
            <ul class="space-y-1 text-gray-300">
              <li>✓ Track up to 5 channels (free tier)</li>
              <li>✓ Real-time notifications when channels go live</li>
              <li>✓ No API key setup required</li>
              <li>✓ Your data syncs across devices</li>
            </ul>
          </div>
        </div>
      </div>
    `

    const loginBtn = document.getElementById('login-button')
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleLoginClick())
    }

    const cancelBtn = document.getElementById('cancel-button')
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancelClick())
    }
  }
}