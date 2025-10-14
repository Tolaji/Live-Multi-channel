// components/AddChannelModal.js

export class AddChannelModal {
  constructor() {
    this.onAddChannel = null;
    this.onClose = null;
    this.loading = false;
    this.searchQuery = '';
    this.searchResults = [];
  }

  mount(container) {
    this.container = container;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <div class="flex justify-between items-center mb-4">
            <h2 class="text-xl font-bold">Add YouTube Channel</h2>
            <button 
              onclick="this.parentElement.parentElement.parentElement.component.handleClose()"
              class="text-gray-400 hover:text-white text-2xl"
            >&times;</button>
          </div>
          
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium mb-2">Channel URL or ID</label>
              <input
                type="text"
                placeholder="https://www.youtube.com/@channelname or UC..."
                value="${this.searchQuery}"
                oninput="this.parentElement.parentElement.parentElement.component.handleSearchInput(this.value)"
                class="w-full px-3 py-2 bg-gray-700 rounded text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            
            ${this.searchResults.length > 0 ? `
              <div class="max-h-60 overflow-y-auto">
                <h3 class="text-sm font-medium mb-2">Search Results:</h3>
                ${this.searchResults.map(channel => `
                  <div class="flex items-center p-3 bg-gray-700 rounded mb-2 cursor-pointer hover:bg-gray-600"
                       onclick="this.parentElement.parentElement.parentElement.parentElement.component.handleSelectChannel(${JSON.stringify(channel).replace(/"/g, '&quot;')})">
                    <img src="${channel.thumbnailUrl}" alt="${channel.channelTitle}" class="w-10 h-10 rounded-full mr-3">
                    <div class="flex-1">
                      <div class="font-semibold text-sm">${channel.channelTitle}</div>
                      <div class="text-xs text-gray-400">${channel.channelId}</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
            
            ${this.loading ? `
              <div class="text-center py-4">
                <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-orange-500 mx-auto"></div>
                <p class="text-sm text-gray-400 mt-2">Searching...</p>
              </div>
            ` : ''}
            
            <div class="text-xs text-gray-400">
              <p>💡 You can find Channel ID in YouTube channel URL: youtube.com/@<strong>ChannelName</strong> or youtube.com/channel/<strong>UC...</strong></p>
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.container.component = this;
  }

  handleSearchInput(query) {
    this.searchQuery = query;
    // You can implement search logic here
  }

  async handleSelectChannel(channel) {
    if (this.onAddChannel) {
      this.loading = true;
      this.render();
      
      try {
        await this.onAddChannel(channel);
        this.handleClose();
      } catch (error) {
        console.error('Error adding channel:', error);
        // Show error toast
        if (window.toast) {
          window.toast.show(`Failed to add channel: ${error.message}`, 'error');
        }
      } finally {
        this.loading = false;
      }
    }
  }

  handleClose() {
    if (this.onClose) {
      this.onClose();
    }
  }
}