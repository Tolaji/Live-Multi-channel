import { userAuth } from '../services/userAuth.js'
import { toast } from './Toast.js'

export class APIKeySetup {
  constructor() {
    this.onComplete = null
    this.apiKey = ''
    this.loading = false
    this.step = 'input'
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
    if (this.step === 'instructions') {
      this.renderInstructions()
    } else {
      this.renderInput()
    }
  }

  renderInput() {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div class="max-w-md w-full">
          <div class="text-center mb-8">
            <h1 class="text-3xl font-bold mb-2">Enter Your YouTube API Key</h1>
            <p class="text-gray-400">
              Your API key is stored locally and never sent to our servers
            </p>
          </div>

          <form onsubmit="this.parentElement.parentElement.component.handleSubmit(event)" class="space-y-4">
            <div>
              <input
                type="password"
                value="${this.apiKey}"
                oninput="this.parentElement.parentElement.parentElement.component.apiKey = this.value"
                placeholder="Enter your YouTube Data API v3 key"
                class="w-full px-4 py-3 bg-gray-800 rounded-lg border border-gray-700 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 outline-none transition"
                required
              />
            </div>

            <button
              type="submit"
              ${this.loading ? 'disabled' : ''}
              class="w-full py-3 bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ${this.loading ? 'Validating...' : 'Save API Key'}
            </button>
          </form>

          <div class="mt-6 text-center">
            <button
              onclick="this.parentElement.parentElement.component.step = 'instructions'; this.parentElement.parentElement.component.render()"
              class="text-orange-500 hover:text-orange-400 transition"
            >
              Need help getting an API key?
            </button>
          </div>

          <div class="mt-8 p-4 bg-gray-800 rounded-lg text-sm text-gray-400">
            <p class="font-semibold mb-2">Why we need this:</p>
            <ul class="space-y-1">
              <li>• Check live status of your subscribed channels</li>
              <li>• Fetch channel information and thumbnails</li>
              <li>• Access live chat messages</li>
              <li>• Your quota, your control</li>
            </ul>
          </div>
        </div>
      </div>
    `

    this.container.component = this
  }

  renderInstructions() {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gray-900 text-white p-8">
        <div class="max-w-4xl mx-auto">
          <h1 class="text-3xl font-bold mb-8">Setup Instructions</h1>
          
          <div class="grid gap-6 md:grid-cols-2">
            <div class="bg-gray-800 p-6 rounded-lg">
              <h3 class="text-xl font-semibold mb-4">1. Go to Google Cloud Console</h3>
              <p class="text-gray-300 mb-4">
                Visit <a href="https://console.cloud.google.com" class="text-orange-500 hover:underline" target="_blank" rel="noopener noreferrer">console.cloud.google.com</a>
              </p>
            </div>
            
            <div class="bg-gray-800 p-6 rounded-lg">
              <h3 class="text-xl font-semibold mb-4">2. Create a New Project</h3>
              <p class="text-gray-300">Create or select an existing project</p>
            </div>
            
            <div class="bg-gray-800 p-6 rounded-lg">
              <h3 class="text-xl font-semibold mb-4">3. Enable YouTube Data API</h3>
              <p class="text-gray-300 mb-4">
                Search for "YouTube Data API v3" and enable it
              </p>
            </div>
            
            <div class="bg-gray-800 p-6 rounded-lg">
              <h3 class="text-xl font-semibold mb-4">4. Create API Credentials</h3>
              <p class="text-gray-300">
                Create an API key in the Credentials section
              </p>
            </div>
          </div>
          
          <div class="mt-8 flex gap-4">
            <button
              onclick="this.parentElement.parentElement.component.step = 'input'; this.parentElement.parentElement.component.render()"
              class="px-6 py-3 bg-orange-500 rounded-lg hover:bg-orange-600 transition"
            >
              I have my API key
            </button>
            <button
              onclick="window.open('https://console.cloud.google.com/apis/credentials', '_blank')"
              class="px-6 py-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
            >
              Open Google Cloud Console
            </button>
          </div>
        </div>
      </div>
    `

    this.container.component = this
  }

  async handleSubmit(event) {
    event.preventDefault()
    if (!this.apiKey.trim()) return

    this.loading = true
    this.render()

    try {
      const isValid = await userAuth.validateAPIKey(this.apiKey)
      
      if (isValid) {
        await userAuth.storeAPIKey(this.apiKey)
        toast.show('API key validated and stored securely!', 'success')
        
        if (this.onComplete) {
          setTimeout(() => this.onComplete(), 1500)
        }
      } else {
        toast.show('Invalid API key. Please check and try again.', 'error')
      }
    } catch {
      toast.show('Failed to validate API key', 'error')
    } finally {
      this.loading = false
      this.render()
    }
  }
}