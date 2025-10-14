export class ModeSelector {
  constructor() {
    this.onModeSelected = null
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h1 class="text-4xl font-bold mb-8">Live Multi-Channel</h1>
        <p class="text-gray-400 mb-12 max-w-md text-center">
          Monitor YouTube live streams from your favorite channels
        </p>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          <!-- Power User Mode -->
          <div 
            id="mode-user-key"
            class="bg-gray-800 rounded-lg p-8 border-2 border-gray-700 hover:border-orange-500 transition cursor-pointer"
          >
            <div class="text-2xl mb-4">🔑</div>
            <h2 class="text-xl font-bold mb-2">Use Your API Key</h2>
            <p class="text-gray-400 text-sm mb-4">
              Bring your own Google Cloud API key. Unlimited channels, your quota.
            </p>
            <ul class="text-sm text-gray-300 space-y-2">
              <li>✓ Track unlimited channels</li>
              <li>✓ Faster polling (5-10 min)</li>
              <li>✓ Full control of your data</li>
              <li>✓ 100% free (uses your quota)</li>
            </ul>
            <div class="mt-6 text-xs text-gray-500">
              Requires: Google Cloud account + API key setup (5 min)
            </div>
          </div>
          
          <!-- RSS Mode -->
          <div 
            id="mode-rss"
            class="bg-gray-800 rounded-lg p-8 border-2 border-gray-700 hover:border-orange-500 transition cursor-pointer"
          >
            <div class="text-2xl mb-4">📡</div>
            <h2 class="text-xl font-bold mb-2">Use RSS Service</h2>
            <p class="text-gray-400 text-sm mb-4">
              Sign in with Google. We handle the heavy lifting.
            </p>
            <ul class="text-sm text-gray-300 space-y-2">
              <li>✓ Track up to 5 channels (free)</li>
              <li>✓ Real-time RSS notifications</li>
              <li>✓ No API setup needed</li>
              <li>✓ Easy for non-technical users</li>
            </ul>
            <div class="mt-6 text-xs text-gray-500">
              Requires: Google account sign-in only
            </div>
          </div>
        </div>
        
        <div class="mt-12 text-sm text-gray-500">
          Not sure? Start with RSS mode. You can always switch later.
        </div>
      </div>
    `

    // Add proper event listeners
    this.attachEventListeners()
  }

  attachEventListeners() {
    const userKeyCard = document.getElementById('mode-user-key')
    const rssCard = document.getElementById('mode-rss')

    if (userKeyCard) {
      userKeyCard.addEventListener('click', () => {
        console.log('[ModeSelector] User-key mode selected')
        this.handleModeSelect('user-key')
      })
    }

    if (rssCard) {
      rssCard.addEventListener('click', () => {
        console.log('[ModeSelector] RSS mode selected')
        this.handleModeSelect('rss')
      })
    }
  }

  handleModeSelect(mode) {
    if (this.onModeSelected) {
      this.onModeSelected(mode)
    }
  }
}