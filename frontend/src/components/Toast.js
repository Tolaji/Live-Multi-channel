class Toast {
  constructor() {
    this.toasts = []
    this.container = null
  }

  mount(container) {
    this.container = container
    this.render()
  }

  show(message, type = 'info', duration = 3000) {
    const id = Date.now()
    this.toasts.push({ id, message, type })
    this.render()

    setTimeout(() => {
      this.toasts = this.toasts.filter(t => t.id !== id)
      this.render()
    }, duration)
  }

  render() {
    if (!this.container) return

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
            ${toast.message}
          </div>
        `).join('')}
      </div>
    `
  }
}

export const toast = new Toast()
export class ToastProvider {
  mount(container) {
    toast.mount(container)
  }
}