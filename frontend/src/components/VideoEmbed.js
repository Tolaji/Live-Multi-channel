// components/VideoEmbed.js
export class VideoEmbed {
  constructor() {
    this.videoId = null
    this.channelTitle = ''
    this.onReady = null
    this.error = null
    this.loading = true
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
    if (!this.videoId) {
      this.container.innerHTML = `
        <div class="flex items-center justify-center h-full bg-black text-white">
          <div class="text-center">
            <div class="text-4xl mb-2">🎬</div>
            <p>No video selected</p>
            <p class="text-sm text-gray-400 mt-1">Select a live channel to start watching</p>
          </div>
        </div>
      `
      return
    }

    if (this.error) {
      this.container.innerHTML = `
        <div class="flex items-center justify-center h-full bg-black text-white">
          <div class="text-center">
            <div class="text-4xl mb-2">❌</div>
            <p>Failed to load video</p>
            <p class="text-sm text-gray-400 mt-1">${this.error}</p>
            <button 
              onclick="this.parentElement.parentElement.parentElement.component.retryLoad()"
              class="mt-4 px-4 py-2 bg-orange-500 rounded hover:bg-orange-600 transition"
            >
              Retry
            </button>
          </div>
        </div>
      `
      this.container.component = this
      return
    }

    if (this.loading) {
      this.container.innerHTML = `
        <div class="flex items-center justify-center h-full bg-black">
          <div class="text-center text-white">
            <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p>Loading player...</p>
          </div>
        </div>
      `
      return
    }

    // Insert the YouTube iframe embed code ---
    this.container.innerHTML = `
      <div class="relative h-full w-full">
        <iframe
          id="${this.iframeId}"
          width="100%"
          height="100%"
          src="https://www.youtube.com/embed/${this.videoId}?autoplay=1&mute=0&rel=0&start=0&enablejsapi=1"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          class="absolute inset-0"
          onload="this.parentElement.parentElement.component.handlePlayerReady()"
          onerror="this.parentElement.parentElement.component.handlePlayerError('Iframe failed to load')"
        ></iframe>

        ${this.loading ? `
          <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75" id="fallback-message">
            <div class="text-center text-white p-4">
              <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p class="mb-2">Loading live stream from: ${this.escapeHtml(this.channelTitle)}</p>
              <a 
                href="https://www.youtube.com/watch?v=${this.videoId}" 
                target="_blank" 
                rel="noopener noreferrer"
                class="inline-block px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
              >
                Watch on YouTube
              </a>
            </div>
          </div>
        ` : ''}
      </div>
    `

    this.container.component = this

    // Show fallback after 5 seconds if iframe doesn't load
    setTimeout(() => {
      if (this.loading) {
        const fallback = document.getElementById('fallback-message')
        if (fallback) fallback.classList.remove('hidden')
      }
    }, 5000)
  }

  handlePlayerReady() {
    console.log('[VideoEmbed] Player ready for video:', this.videoId)
    this.loading = false
    this.error = null
    if (this.onReady) {
      this.onReady()
    }
    this.render()
  }

  handlePlayerError(errorMessage) {
    console.error('[VideoEmbed] Player error:', errorMessage)
    this.loading = false
    this.error = errorMessage
    this.render()
  }

  retryLoad() {
    this.loading = true
    this.error = null
    this.render()
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  // Update video ID and reload
  updateVideo(videoId, channelTitle = '') {
    if (this.videoId !== videoId) {
      this.videoId = videoId
      this.channelTitle = channelTitle
      this.loading = true
      this.error = null
      this.render()
    }
  }
}