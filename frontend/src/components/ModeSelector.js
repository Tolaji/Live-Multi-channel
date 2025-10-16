// frontend/src/components/ModeSelector.js
// Enhanced with "Continue with last mode" functionality

export class ModeSelector {
  constructor() {
    this.onModeSelected = null
    this.lastMode = null
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
    const hasLastMode = this.lastMode && (this.lastMode === 'user-key' || this.lastMode === 'rss')
    
    this.container.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <h1 class="text-4xl font-bold mb-4">Live Multi-Channel</h1>
        <p class="text-gray-400 mb-8 max-w-md text-center">
          Monitor YouTube live streams from your favorite channels
        </p>
        
        ${hasLastMode ? this.renderContinueSection() : ''}
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          ${this.renderModeCard('user-key')}
          ${this.renderModeCard('rss')}
        </div>
        
        <div class="mt-8 text-sm text-gray-500">
          ${hasLastMode ? 'Or choose a different mode above' : 'Not sure? Start with RSS mode. You can always switch later.'}
        </div>
      </div>
    `

    this.attachEventListeners()
  }

  renderContinueSection() {
    const modeInfo = {
      'user-key': { icon: '🔑', label: 'API Key Mode' },
      'rss': { icon: '📡', label: 'RSS Mode' }
    }
    
    const info = modeInfo[this.lastMode]
    if (!info) return ''
    
    return `
      <div class="mb-8 w-full max-w-md">
        <p class="text-sm text-gray-400 mb-3 text-center">Welcome back!</p>
        <button
          id="continue-last-mode"
          class="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 px-6 rounded-lg transition transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
        >
          <span class="text-2xl">${info.icon}</span>
          <div class="text-left">
            <div class="text-lg">Continue with ${info.label}</div>
            <div class="text-sm opacity-90">Pick up where you left off</div>
          </div>
        </button>
      </div>
    `
  }

  renderModeCard(mode) {
    const isLastMode = this.lastMode === mode
    
    const modeData = {
      'user-key': {
        icon: '🔑',
        title: 'Use Your API Key',
        description: 'Bring your own Google Cloud API key. Unlimited channels, your quota.',
        features: [
          'Track unlimited channels',
          'Faster polling (5-10 min)',
          'Full control of your data',
          '100% free (uses your quota)'
        ],
        requirement: 'Requires: Google Cloud account + API key setup (5 min)'
      },
      'rss': {
        icon: '📡',
        title: 'Use RSS Service',
        description: 'Sign in with Google. We handle the heavy lifting.',
        features: [
          'Track up to 5 channels (free)',
          'Real-time RSS notifications',
          'No API setup needed',
          'Easy for non-technical users'
        ],
        requirement: 'Requires: Google account sign-in only'
      }
    }
    
    const data = modeData[mode]
    
    return `
      <div 
        id="mode-${mode}"
        class="bg-gray-800 rounded-lg p-8 border-2 transition cursor-pointer
               ${isLastMode ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-gray-700 hover:border-orange-500'}"
      >
        <div class="text-2xl mb-4">${data.icon}</div>
        <h2 class="text-xl font-bold mb-2">
          ${data.title}
          ${isLastMode ? '<span class="text-sm text-orange-500 ml-2">(Last used)</span>' : ''}
        </h2>
        <p class="text-gray-400 text-sm mb-4">
          ${data.description}
        </p>
        <ul class="text-sm text-gray-300 space-y-2 mb-6">
          ${data.features.map(feature => `<li>✓ ${feature}</li>`).join('')}
        </ul>
        <div class="text-xs text-gray-500">
          ${data.requirement}
        </div>
      </div>
    `
  }

  attachEventListeners() {
    const continueBtn = document.getElementById('continue-last-mode')
    if (continueBtn && this.lastMode) {
      continueBtn.addEventListener('click', () => {
        console.log('[ModeSelector] Continue with last mode:', this.lastMode)
        this.handleModeSelect(this.lastMode)
      })
    }

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