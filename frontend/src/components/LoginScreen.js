// src/components/LoginScreen.js
import { toast } from './Toast.js'

export class LoginScreen {
  constructor() {
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
    this.loading = false
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
      // redirect to backend login flow
      window.location.href = `${this.backendUrl}/auth/login`
    } catch (error) {
      console.error('[LoginScreen] handleLoginClick error:', error)
      toast.show('Login failed. Please try again.', 'error')
      this.loading = false
      this.render()
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
          <h1 class="text-3xl font-bold mb-2">Sign in to Continue</h1>
          <p class="text-gray-400 mb-4">
            You selected RSS mode — please sign in with your Google account.
          </p>
          <button id="login-button"
            class="w-full py-3 px-4 bg-orange-500 rounded-lg hover:bg-orange-600 transition font-semibold text-white
                   ${this.loading ? 'opacity-50 cursor-not-allowed' : ''}"
            ${this.loading ? 'disabled' : ''}
          >
            ${this.loading ? 'Redirecting...' : 'Sign in with Google'}
          </button>
        </div>
      </div>
    `

    const loginBtn = document.getElementById('login-button')
    if (loginBtn) {
      loginBtn.addEventListener('click', () => this.handleLoginClick())
    } else {
      console.error('[LoginScreen] login-button not found')
    }
  }
}
