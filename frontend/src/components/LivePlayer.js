import { VideoEmbed } from './VideoEmbed.js'
import { LiveChat } from './LiveChat.js'

export class LivePlayer {
  constructor() {
    this.videoId = null
    this.channelTitle = ''
    this.showChat = false
    this.onChatToggle = null
    this.playerReady = false
  }

  mount(container) {
    this.container = container
    this.render()
  }

  render() {
    this.container.innerHTML = `
      <div class="h-full flex">
        <!-- Video player -->
        <div class="flex-1 bg-black relative ${this.showChat ? 'w-2/3' : 'w-full'}">
          <div id="video-embed"></div>
          
          <!-- Player controls overlay -->
          ${this.playerReady ? `
            <div class="absolute bottom-4 right-4 flex gap-2">
              <!-- Chat Toggle -->
              <button
                onclick="this.parentElement.parentElement.parentElement.parentElement.component.toggleChat()"
                class="px-3 py-2 bg-gray-800 bg-opacity-90 rounded hover:bg-opacity-100 transition text-sm"
              >
                ${this.showChat ? '💬 Hide Chat' : '💬 Show Chat'}
              </button>
            </div>
          ` : ''}
          
          <!-- Loading overlay -->
          ${!this.playerReady ? `
            <div class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
              <div class="text-center text-white">
                <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500 mx-auto mb-2"></div>
                <p>Loading player...</p>
              </div>
            </div>
          ` : ''}
        </div>
        
        <!-- Live chat -->
        ${this.showChat ? `
          <div class="w-1/3 bg-gray-800 border-l border-gray-700">
            <div id="live-chat"></div>
          </div>
        ` : ''}
      </div>
    `

    this.container.component = this

    // Mount video embed
    const videoEmbed = new VideoEmbed()
    videoEmbed.mount(document.getElementById('video-embed'))
    videoEmbed.videoId = this.videoId
    videoEmbed.channelTitle = this.channelTitle
    videoEmbed.onReady = () => {
      this.playerReady = true
      this.render()
    }

    // Mount live chat if shown
    if (this.showChat) {
      const liveChat = new LiveChat()
      liveChat.mount(document.getElementById('live-chat'))
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
}