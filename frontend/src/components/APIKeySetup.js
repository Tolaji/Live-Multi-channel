// frontend/src/components/APIKeySetup.js
// Enhanced with cancel button to return to mode selector

import { toast } from './Toast.js'

export class APIKeySetup {
  constructor() {
    this.apiKey = ''
    this.loading = false
    this.onComplete = null
    this.onCancel = null
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div class="max-w-2xl w-full">
          <div class="text-center mb-8">
            <div class="text-6xl mb-4">🔑</div>
            <h1 class="text-3xl font-bold mb-2">Setup Your API Key</h1>
            <p class="text-gray-400">
              Enter your Google Cloud YouTube Data API v3 key to get started
            </p>
          </div>

          <div class="bg-gray-800 rounded-lg p-6 mb-6">
            <label class="block text-sm font-medium mb-2">YouTube Data API Key</label>
            <input
              type="text"
              id="api-key-input"
              placeholder="AIzaSyC..."
              value="${this.apiKey}"
              class="w-full px-4 py-3 bg-gray-700 rounded border border-gray-600 focus:border-orange-500 focus:outline-none text-white"
              ${this.loading ? 'disabled' : ''}
            />
            <p class="text-sm text-gray-400 mt-2">
              Your API key is stored locally and never sent to our servers
            </p>
          </div>

          <div class="space-y-3 mb-6">
            <button
              id="save-button"
              class="w-full py-3 px-4 bg-orange-500 rounded-lg hover:bg-orange-600 transition font-semibold
                     ${this.loading ? 'opacity-50 cursor-not-allowed' : ''}"
              ${this.loading ? 'disabled' : ''}
            >
              ${this.loading ? 'Validating...' : '✓ Save and Continue'}
            </button>
            
            <button
              id="cancel-button"
              class="w-full py-3 px-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition font-medium"
              ${this.loading ? 'disabled' : ''}
            >
              ← Back to Mode Selection
            </button>
          </div>

          <div class="bg-gray-800 rounded-lg p-6">
            <h3 class="font-semibold mb-3 text-orange-500">📋 How to Get Your API Key:</h3>
            <ol class="space-y-2 text-sm text-gray-300">
              <li>1. Go to <a href="https://console.cloud.google.com" target="_blank" class="text-blue-400 hover:underline">Google Cloud Console</a></li>
              <li>2. Create a new project or select existing one</li>
              <li>3. Enable "YouTube Data API v3"</li>
              <li>4. Go to "Credentials" → "Create Credentials" → "API Key"</li>
              <li>5. Copy your API key and paste it above</li>
            </ol>
            <div class="mt-4 p-3 bg-gray-750 rounded text-xs text-gray-400">
              <strong class="text-orange-400">⚠️ Important:</strong> Your API key has a daily quota of 10,000 units. 
              The app is optimized to stay within this limit for typical usage.
            </div>
          </div>
        </div>
      </div>
    `

    this.attachEventListeners()
  }

  attachEventListeners() {
    const input = document.getElementById('api-key-input')
    const saveBtn = document.getElementById('save-button')
    const cancelBtn = document.getElementById('cancel-button')

    if (input) {
      input.addEventListener('input', (e) => {
        this.apiKey = e.target.value.trim()
      })
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !this.loading) {
          this.handleSave()
        }
      })
    }

    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSave())
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel())
    }
  }

  async handleSave() {
    if (!this.apiKey) {
      toast.show('Please enter an API key', 'warning')
      return
    }

    if (this.loading) return

    this.loading = true
    this.render()

    try {
      // Store API key in localStorage
      localStorage.setItem('youtube_api_key', this.apiKey)
      
      // Validate by making a test request
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&type=video&maxResults=1&key=${this.apiKey}`
      )

      if (!response.ok) {
        throw new Error('Invalid API key or quota exceeded')
      }

      console.log('[APIKeySetup] API key validated successfully')
      toast.show('API key saved successfully!', 'success')
      
      if (this.onComplete) {
        this.onComplete()
      }
    } catch (error) {
      console.error('[APIKeySetup] Validation failed:', error)
      localStorage.removeItem('youtube_api_key')
      toast.show(`Invalid API key: ${error.message}`, 'error')
      this.loading = false
      this.render()
    }
  }

  handleCancel() {
    console.log('[APIKeySetup] Cancel clicked')
    if (this.onCancel) {
      this.onCancel()
    }
  }
}