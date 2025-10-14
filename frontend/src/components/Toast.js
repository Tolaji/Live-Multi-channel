class Toast {
  constructor() {
    this.toasts = []
    this.container = null
  }

  mount(container) {
    if (!container) {
      console.error('[Toast] Cannot mount: container is null')
      return
    }
    this.container = container
    this.render()
    console.log('[Toast] Mounted successfully')
  }

  show(message, type = 'info', duration = 3000) {
    const id = Date.now()
    this.toasts.push({ id, message, type })
    
    // If container exists, render immediately
    if (this.container) {
      this.render()
    } else {
      // Fallback: log to console if toast system not ready
      console.log(`[Toast] ${type.toUpperCase()}: ${message}`)
    }

    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id)
      if (this.container) {
        this.render()
      }
    }, duration)
  }

  render() {
    if (!this.container) {
      console.warn('[Toast] Cannot render: container not mounted')
      return
    }

    this.container.innerHTML = `
      <div class="fixed bottom-4 right-4 z-50 space-y-2">
        ${this.toasts.map(toast => `
          <div class="
            px-4 py-3 rounded-lg shadow-lg text-white min-w-[300px]
            animate-slide-in-right
            ${toast.type === 'success' ? 'bg-green-600' : ''}
            ${toast.type === 'error' ? 'bg-red-600' : ''}
            ${toast.type === 'info' ? 'bg-blue-600' : ''}
            ${toast.type === 'warning' ? 'bg-yellow-600' : ''}
          ">
            <div class="flex items-center gap-2">
              ${this.getIcon(toast.type)}
              <span>${toast.message}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    }
    return icons[type] || icons.info
  }
}

// Export singleton instance
export const toast = new Toast()

// Also export class for manual instantiation if needed
export class ToastProvider {
  mount(container) {
    toast.mount(container)
  }
}