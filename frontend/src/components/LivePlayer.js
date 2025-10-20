// components/LivePlayer.js
import { VideoEmbed } from './VideoEmbed.js'
import { LiveChat } from './LiveChat.js'

export class LivePlayer {
  constructor() {
    this.videoId = null
    this.channelTitle = ''
    this.showChat = false
    this.onChatToggle = null
    this.playerReady = false
    this.videoEmbed = null
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
    this.container.innerHTML = `
      <div class="h-full flex bg-black">
        <!-- Video player section -->
        <div class="flex-1 relative ${this.showChat ? 'w-2/3' : 'w-full'}">
          <div id="video-embed" class="h-full"></div>
          
          <!-- Player controls overlay -->
          ${this.playerReady ? `
            <div class="absolute bottom-4 right-4 flex gap-2 z-10">
              <!-- Chat Toggle -->
              <button
                onclick="this.parentElement.parentElement.parentElement.component.toggleChat()"
                class="px-4 py-2 bg-gray-800 bg-opacity-90 rounded-lg hover:bg-opacity-100 transition text-white flex items-center gap-2 shadow-lg"
                title="${this.showChat ? 'Hide Chat' : 'Show Chat'}"
              >
                ${this.showChat ? '💬 Hide Chat' : '💬 Show Chat'}
              </button>
              
              <!-- Watch on YouTube -->
              ${this.videoId ? `
                <a
                  href="https://www.youtube.com/watch?v=${this.videoId}"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-4 py-2 bg-red-600 bg-opacity-90 rounded-lg hover:bg-opacity-100 transition text-white flex items-center gap-2 shadow-lg"
                  title="Open in YouTube"
                >
                  📺 YouTube
                </a>
              ` : ''}
            </div>
          ` : ''}
          
          <!-- Loading overlay -->
          ${!this.playerReady ? `
            <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-20">
              <div class="text-center text-white">
                <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
                <p class="text-lg">Loading player...</p>
                <p class="text-sm text-gray-300 mt-2">This may take a few seconds</p>
                ${this.videoId ? `
                  <a 
                    href="https://www.youtube.com/watch?v=${this.videoId}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="inline-block mt-4 px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
                  >
                    Watch on YouTube instead
                  </a>
                ` : ''}
              </div>
            </div>
          ` : ''}
        </div>
        
        <!-- Live chat -->
        ${this.showChat ? `
          <div class="w-1/3 bg-gray-800 border-l border-gray-700 flex flex-col">
            <div class="p-3 border-b border-gray-700">
              <h3 class="font-semibold text-white">Live Chat</h3>
            </div>
            <div id="live-chat" class="flex-1"></div>
          </div>
        ` : ''}
      </div>
    `

    this.container.component = this

    // Mount video embed
    this.mountVideoEmbed()
    
    // Mount live chat if shown
    if (this.showChat) {
      this.mountLiveChat()
    }
  }

  mountVideoEmbed() {
    const videoContainer = document.getElementById('video-embed')
    if (!videoContainer) return

    if (!this.videoEmbed) {
      this.videoEmbed = new VideoEmbed()
      // Crucially, connect the events
      this.videoEmbed.onReady = () => {
        this.playerReady = true
        this.render()
      }
    }

    this.videoEmbed.videoId = this.videoId
    this.videoEmbed.channelTitle = this.channelTitle
    
    // It's crucial to call mount again to re-render the content inside the VideoEmbed
    this.videoEmbed.mount(videoContainer)
  }

  mountLiveChat() {
    const chatContainer = document.getElementById('live-chat')
    if (chatContainer) {
      const liveChat = new LiveChat()
      liveChat.mount(chatContainer)
      liveChat.videoId = this.videoId
    }
  }

  toggleChat() {
    this.showChat = !this.showChat
    if (this.onChatToggle) {
      this.onChatToggle(this.showChat)
    }
    this.render()
  }

  // Update video content
  updateVideo(videoId, channelTitle = '') {
    if (this.videoId !== videoId) {
      this.videoId = videoId
      this.channelTitle = channelTitle
      this.playerReady = false
      
      if (this.videoEmbed) {
        this.videoEmbed.updateVideo(videoId, channelTitle)
      }
      
      this.render()
    }
  }
}