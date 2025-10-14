// // Sidebar.js
// import { ChannelList } from './ChannelList.js'
// import { AddChannelModal } from './AddChannelModal.js';

// export class Sidebar {
//   constructor() {
//     this.channels = []
//     this.liveStatus = {}
//     this.activeChannel = null
//     this.onChannelSelect = null
//     this.onAddChannel = null
//     this.onRemoveChannel = null
//     this.searchQuery = ''
//     this.showAddModal = false
//   }

//   mount(container) {
//     if (!container) {
//       console.error('[Sidebar] mount failed: container is null or undefined')
//       return
//     }
//     this.container = container
//     this.render()
//   }

//   render() {
//     if (!this.container) {
//       console.error('[Sidebar] render called but this.container is null')
//       return
//     }

//     const filteredChannels = this.channels.filter(channel =>
//       channel.channelTitle.toLowerCase().includes(this.searchQuery.toLowerCase())
//     )

//     const liveChannels = filteredChannels.filter(channel =>
//       this.liveStatus[channel.channelId]?.isLive
//     )

//     const offlineChannels = filteredChannels.filter(channel =>
//       !this.liveStatus[channel.channelId]?.isLive
//     )

//     this.container.innerHTML = `
//       <aside class="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
//         <!-- Search -->
//         <div class="p-4 border-b border-gray-700">
//           <input
//             type="text"
//             placeholder="Search channels..."
//             value="${this.searchQuery}"
//             oninput="this.parentElement.parentElement.component.searchQuery = this.value; this.parentElement.parentElement.component.render()"
//             class="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
//           />
//         </div>
        
//         <!-- Channel list -->
//         <div class="flex-1 overflow-y-auto">
//           ${this.renderChannelSection('LIVE NOW', liveChannels, 'orange-500', true)}
//           ${this.renderChannelSection('OFFLINE', offlineChannels, 'gray-400', false)}
          
//           ${filteredChannels.length === 0 ? `
//             <div class="p-4 text-center text-gray-400">
//               ${this.searchQuery ? 'No channels match your search' : 'No channels yet'}
//             </div>
//           ` : ''}
//         </div>
        
//         <!-- Footer -->
//         <div class="p-4 border-t border-gray-700">
//           ${this.onAddChannel ? `
//             <button
//               onclick="this.parentElement.parentElement.component.showAddModal = true; this.parentElement.parentElement.component.render()"
//               class="w-full px-4 py-2 bg-orange-500 rounded hover:bg-orange-600 font-semibold mb-2"
//             >
//               + Add Channel
//             </button>
//           ` : ''}
          
//           <div class="text-xs text-gray-400 text-center">
//             ${this.channels.length} channel${this.channels.length !== 1 ? 's' : ''} tracked
//           </div>
//         </div>
//       </aside>

//       // ${this.showAddModal ? this.renderAddModal() : ''}
//       ${this.showAddModal ? `
//       <div id="add-channel-modal-container"></div>
//     ` : ''}
//     `;
    
//     this.container.component = this

//     if (this.showAddModal) {
//       this.mountAddChannelModal();
//     }

//     this.mountChannelLists()
//   }

//   mountAddChannelModal() {
//     const modalContainer = document.getElementById('add-channel-modal-container');
//     if (!modalContainer) return;

//     const modal = new AddChannelModal();
//     modal.mount(modalContainer);
//     modal.onAddChannel = async (channelData) => {
//       if (this.onAddChannel) {
//         await this.onAddChannel(channelData);
//         this.showAddModal = false;
//         this.render();
//       }
//     };
//     modal.onClose = () => {
//       this.showAddModal = false;
//       this.render();
//     };
//   }

//   renderChannelSection(title, channels, color, isLive) {
//     if (channels.length === 0) return ''
//     // Create safe ID
//     const id = `channel-list-${title.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '')}`
//     return `
//       <div class="p-4">
//         <h3 class="text-sm font-semibold text-${color} mb-2 flex items-center">
//           ${isLive ? '<span class="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>' : ''}
//           ${title} (${channels.length})
//         </h3>
//         <div id="${id}"></div>
//       </div>
//     `
//   }

//   mountChannelLists() {
//     const liveId = 'channel-list-live-now'
//     const offlineId = 'channel-list-offline'

//     const liveContainer = document.getElementById(liveId)
//     if (liveContainer) {
//       const liveChannels = this.channels.filter(ch => this.liveStatus[ch.channelId]?.isLive)
//       const channelList = new ChannelList()
//       channelList.mount(liveContainer)
//       channelList.channels = liveChannels
//       channelList.liveStatus = this.liveStatus
//       channelList.activeChannel = this.activeChannel
//       channelList.onChannelSelect = this.onChannelSelect
//       channelList.onRemoveChannel = this.onRemoveChannel
//     }

//     const offlineContainer = document.getElementById(offlineId)
//     if (offlineContainer) {
//       const offlineChannels = this.channels.filter(ch => !this.liveStatus[ch.channelId]?.isLive)
//       const channelList = new ChannelList()
//       channelList.mount(offlineContainer)
//       channelList.channels = offlineChannels
//       channelList.liveStatus = this.liveStatus
//       channelList.activeChannel = this.activeChannel
//       channelList.onChannelSelect = this.onChannelSelect
//       channelList.onRemoveChannel = this.onRemoveChannel
//     }
//   }

//   renderAddModal() {
//     return `
//       <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
//         <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md">
//           <h2 class="text-xl font-bold mb-4">Add Channel</h2>
//           <div id="add-channel-modal-content"></div>
//         </div>
//       </div>
//     `
//   }

//   addTestChannel() {
//     const testChannel = {
//       channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', // Google Developers channel
//       channelTitle: 'Google Developers',
//       thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/APkrFKZ2M8gM_7T5WkPbqF_NYNC2KVBQ2sdGIp2ag0S7=s176-c-k-c0x00ffffff-no-rj'
//     };

//     if (this.onAddChannel) {
//       this.onAddChannel(testChannel);
//     }
//   }
// }

// Sidebar.js - Simplified and fixed version
// Sidebar.js - Complete fix for channel rendering
import { ChannelList } from './ChannelList.js';

export class Sidebar {
  constructor() {
    this.channels = [];
    this.liveStatus = {};
    this.activeChannel = null;
    this.onChannelSelect = null;
    this.onAddChannel = null;
    this.onRemoveChannel = null;
    this.searchQuery = '';
  }

  mount(container) {
    if (!container) {
      console.error('[Sidebar] mount failed: container is null');
      return;
    }
    this.container = container;
    this.render();
  }

  render() {
    console.log('[Sidebar] Rendering with', this.channels.length, 'channels');
    
    const filteredChannels = this.channels.filter(channel =>
      channel.channelTitle.toLowerCase().includes(this.searchQuery.toLowerCase())
    );

    const liveChannels = filteredChannels.filter(channel =>
      this.liveStatus[channel.channelId]?.isLive
    );

    const offlineChannels = filteredChannels.filter(channel =>
      !this.liveStatus[channel.channelId]?.isLive
    );

    this.container.innerHTML = `
      <div class="h-full flex flex-col bg-gray-800">
        <!-- Search -->
        <div class="p-4 border-b border-gray-700">
          <input
            type="text"
            placeholder="Search ${this.channels.length} channels..."
            value="${this.searchQuery}"
            class="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            id="sidebar-search-input"
          />
        </div>
        
        <!-- Channel list -->
        <div class="flex-1 overflow-y-auto">
          ${liveChannels.length > 0 ? this.renderChannelSection('LIVE NOW', liveChannels, 'orange-500', true) : ''}
          ${offlineChannels.length > 0 ? this.renderChannelSection('OFFLINE', offlineChannels, 'gray-400', false) : ''}
          
          ${filteredChannels.length === 0 ? `
            <div class="p-8 text-center text-gray-400">
              <div class="text-4xl mb-2">🔍</div>
              <p>${this.searchQuery ? 'No channels match your search' : 'No channels yet'}</p>
            </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div class="p-4 border-t border-gray-700 bg-gray-750">
          ${this.onAddChannel ? `
            <button
              id="sidebar-add-channel-btn"
              class="w-full px-4 py-2 bg-orange-500 rounded hover:bg-orange-600 font-semibold mb-2 transition"
            >
              + Add Channel
            </button>
          ` : ''}
          
          
          <div class="text-xs text-gray-400 text-center">
            ${this.channels.length} channel${this.channels.length !== 1 ? 's' : ''} tracked
          </div>
        </div>
      </div>
    `;

    
    // Add event listeners
    this.mountEventListeners();
    
    // Mount channel lists with proper timing
    setTimeout(() => {
      this.mountChannelLists();
    }, 10);
    
  }

  renderChannelSection(title, channels, color, isLive) {
    const safeId = `channel-list-${title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    return `
      <div class="border-b border-gray-700">
        <div class="p-4 pb-2">
          <h3 class="text-sm font-semibold text-${color} mb-2 flex items-center">
            ${isLive ? '<span class="w-2 h-2 bg-orange-500 rounded-full mr-2 animate-pulse"></span>' : ''}
            ${title} (${channels.length})
          </h3>
        </div>
        <div id="${safeId}" class="px-2 pb-2"></div>
      </div>
    `;
  }

  mountEventListeners() {
    // Search input
    const searchInput = document.getElementById('sidebar-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
      });
    }

    // Add channel button
    const addChannelBtn = document.getElementById('sidebar-add-channel-btn');
    if (addChannelBtn && this.onAddChannel) {
      addChannelBtn.addEventListener('click', () => {
        this.showAddChannelModal();
      });
    }
  }

  mountChannelLists() {
    console.log('[Sidebar] Mounting channel lists...');
    
    // Mount live channels
    const liveContainer = document.getElementById('channel-list-live-now');
    if (liveContainer) {
      const liveChannels = this.channels.filter(ch => this.liveStatus[ch.channelId]?.isLive);
      console.log('[Sidebar] Mounting', liveChannels.length, 'live channels');
      
      const channelList = new ChannelList();
      channelList.mount(liveContainer);
      channelList.channels = liveChannels;
      channelList.liveStatus = this.liveStatus;
      channelList.activeChannel = this.activeChannel;
      channelList.onChannelSelect = this.onChannelSelect;
      channelList.onRemoveChannel = this.onRemoveChannel;
    }

    // Mount offline channels
    const offlineContainer = document.getElementById('channel-list-offline');
    if (offlineContainer) {
      const offlineChannels = this.channels.filter(ch => !this.liveStatus[ch.channelId]?.isLive);
      console.log('[Sidebar] Mounting', offlineChannels.length, 'offline channels');
      
      const channelList = new ChannelList();
      channelList.mount(offlineContainer);
      channelList.channels = offlineChannels;
      channelList.liveStatus = this.liveStatus;
      channelList.activeChannel = this.activeChannel;
      channelList.onChannelSelect = this.onChannelSelect;
      channelList.onRemoveChannel = this.onRemoveChannel;
    }
  }

  showAddChannelModal() {
    const channelUrl = prompt('Enter YouTube Channel URL or ID:\n\nExamples:\n• https://www.youtube.com/@ChannelName\n• UCxxxxxxxxxxxxxxxxxxxxxx');
    
    if (channelUrl) {
      this.addChannelFromInput(channelUrl);
    }
  }

  addChannelFromInput(input) {
    let channelId = '';
    let channelTitle = 'New Channel';
    let thumbnailUrl = '';

    if (input.includes('youtube.com/channel/')) {
      channelId = input.split('youtube.com/channel/')[1]?.split(/[\/?]/)[0] || input;
    } else if (input.includes('youtube.com/@')) {
      channelId = input.split('youtube.com/@')[1]?.split(/[\/?]/)[0] || input;
    } else if (input.startsWith('UC') && input.length > 20) {
      channelId = input;
    } else {
      channelId = input;
    }

    channelId = channelId.trim();

    if (!channelId) {
      alert('Please enter a valid YouTube Channel URL or ID');
      return;
    }

    const channelData = {
      channelId: channelId,
      channelTitle: channelTitle,
      thumbnailUrl: thumbnailUrl || `https://via.placeholder.com/48/374151/FFFFFF?text=YT`
    };

    if (this.onAddChannel) {
      this.onAddChannel(channelData);
    }
  }
}