export class LiveChat {
  constructor() {
    this.videoId = null
    this.messages = []
    this.loading = true
    this.error = null
    this.interval = null
  }

  mount(container) {
    this.container = container
    this.fetchMessages()
    this.startPolling()
    this.render()
  }

  unmount() {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }

  async fetchMessages() {
    if (!this.videoId) return

    try {
      this.error = null
      // Simulate fetching messages - in real app, this would call your backend
      this.messages = [
        { author: 'ChatBot', message: 'Welcome to the live chat!', publishedAt: new Date().toISOString() },
        { author: 'Viewer123', message: 'Hello everyone!', publishedAt: new Date().toISOString() }
      ]
      this.loading = false
    } catch (err) {
      this.error = err.message
      this.loading = false
    } finally {
      this.render()
    }
  }

  startPolling() {
    this.interval = setInterval(() => {
      this.fetchMessages()
    }, 5000)
  }

  render() {
    this.container.innerHTML = `
      <div class="flex flex-col h-full">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-gray-700">
          <h3 class="font-semibold">Live Chat</h3>
        </div>
        
        <!-- Messages -->
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          ${this.loading ? `
            <div class="flex items-center justify-center h-full">
              <div class="text-gray-400">Loading chat...</div>
            </div>
          ` : this.error ? `
            <div class="flex items-center justify-center h-full p-4">
              <div class="text-red-500 text-center">
                <p class="mb-2">Chat unavailable</p>
                <p class="text-sm">${this.error}</p>
              </div>
            </div>
          ` : this.messages.length === 0 ? `
            <div class="text-gray-400 text-center text-sm">
              No messages yet
            </div>
          ` : this.messages.map(message => `
            <div class="text-sm">
              <span class="font-semibold text-orange-500">
                ${message.author}
              </span>
              <span class="text-gray-300 ml-2">
                ${message.message}
              </span>
            </div>
          `).join('')}
        </div>
        
        <!-- Footer note -->
        <div class="px-4 py-2 border-t border-gray-700 text-xs text-gray-500">
          Read-only chat (updates every 5s)
        </div>
      </div>
    `
  }
}