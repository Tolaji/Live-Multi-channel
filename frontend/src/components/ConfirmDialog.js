// frontend/src/components/ConfirmDialog.js
// Reusable confirmation dialog with promise-based API

export class ConfirmDialog {
  constructor(options = {}) {
    this.title = options.title || 'Confirm Action'
    this.message = options.message || 'Are you sure?'
    this.confirmText = options.confirmText || 'Confirm'
    this.cancelText = options.cancelText || 'Cancel'
    this.type = options.type || 'info' // 'info', 'warning', 'danger', 'success'
    this.onConfirm = options.onConfirm || null
    this.onCancel = options.onCancel || null
    this.container = null
  }

  // Static method for promise-based usage
  static show(options) {
    return new Promise((resolve) => {
      const dialog = new ConfirmDialog({
        ...options,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      })
      dialog.show()
    })
  }

  show() {
    this.container = document.createElement('div')
    this.container.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4'
    this.container.style.animation = 'fadeIn 0.2s ease-out'
    this.container.innerHTML = this.renderDialog()
    document.body.appendChild(this.container)
    this.attachEventListeners()
    this.addAnimationStyles()
    
    setTimeout(() => {
      const confirmBtn = this.container.querySelector('#dialog-confirm-btn')
      if (confirmBtn) confirmBtn.focus()
    }, 100)
    
    this.handleEscape = (e) => {
      if (e.key === 'Escape') this.handleCancel()
    }
    document.addEventListener('keydown', this.handleEscape)
  }

  renderDialog() {
    const typeConfig = {
      info: { icon: 'ℹ️', bgClass: 'bg-blue-600', hoverClass: 'hover:bg-blue-700' },
      warning: { icon: '⚠️', bgClass: 'bg-orange-600', hoverClass: 'hover:bg-orange-700' },
      danger: { icon: '🚨', bgClass: 'bg-red-600', hoverClass: 'hover:bg-red-700' },
      success: { icon: '✅', bgClass: 'bg-green-600', hoverClass: 'hover:bg-green-700' }
    }
    
    const config = typeConfig[this.type] || typeConfig.info
    
    const formattedMessage = this.message
      .split('\n')
      .map(line => line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>'))
      .join('<br>')
    
    return `
      <div class="bg-gray-800 rounded-lg shadow-2xl max-w-md w-full transform" style="animation: scaleIn 0.2s ease-out">
        <div class="px-6 py-4 border-b border-gray-700 flex items-center">
          <span class="text-2xl mr-3">${config.icon}</span>
          <h3 class="text-xl font-bold text-white">${this.escapeHtml(this.title)}</h3>
        </div>
        
        <div class="px-6 py-6">
          <div class="text-gray-300 leading-relaxed space-y-2">
            ${formattedMessage}
          </div>
        </div>
        
        <div class="px-6 py-4 bg-gray-750 rounded-b-lg flex justify-end gap-3">
          <button
            id="dialog-cancel-btn"
            class="px-5 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition font-medium focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            ${this.escapeHtml(this.cancelText)}
          </button>
          <button
            id="dialog-confirm-btn"
            class="px-5 py-2 ${config.bgClass} ${config.hoverClass} text-white rounded-lg transition font-medium focus:outline-none focus:ring-2 focus:ring-offset-2"
          >
            ${this.escapeHtml(this.confirmText)}
          </button>
        </div>
      </div>
    `
  }

  attachEventListeners() {
    const confirmBtn = this.container.querySelector('#dialog-confirm-btn')
    const cancelBtn = this.container.querySelector('#dialog-cancel-btn')
    
    if (confirmBtn) {
      confirmBtn.addEventListener('click', () => this.handleConfirm())
    }
    
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel())
    }
    
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.handleCancel()
      }
    })
  }

  handleConfirm() {
    this.close()
    if (this.onConfirm) this.onConfirm()
  }

  handleCancel() {
    this.close()
    if (this.onCancel) this.onCancel()
  }

  close() {
    if (this.handleEscape) {
      document.removeEventListener('keydown', this.handleEscape)
    }
    
    if (this.container) {
      this.container.style.animation = 'fadeOut 0.2s ease-out'
      setTimeout(() => {
        if (this.container && this.container.parentNode) {
          this.container.parentNode.removeChild(this.container)
        }
      }, 200)
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  addAnimationStyles() {
    if (!document.getElementById('confirm-dialog-styles')) {
      const style = document.createElement('style')
      style.id = 'confirm-dialog-styles'
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `
      document.head.appendChild(style)
    }
  }
}