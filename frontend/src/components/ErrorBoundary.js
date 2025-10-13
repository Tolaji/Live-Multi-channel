export class ErrorBoundary {
  constructor() {
    this.hasError = false
    this.error = null
    this.errorInfo = null
  }

  mount(container) {
    this.container = container
    this.setupErrorHandling()
  }

  setupErrorHandling() {
    window.addEventListener('error', (event) => {
      this.handleError(event.error)
    })

    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(event.reason)
    })
  }

  handleError(error, errorInfo = '') {
    this.hasError = true
    this.error = error
    this.errorInfo = errorInfo
    this.render()

    // Log to console instead of backend since endpoint doesn't exist
    console.error('Application Error:', error, errorInfo)
  }

  render() {
    if (!this.hasError) return

    this.container.innerHTML = `
      <div class="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
        <div class="max-w-md text-center">
          <h1 class="text-2xl font-bold mb-4">Something went wrong</h1>
          <p class="text-gray-400 mb-6">
            We've logged the error and will fix it soon.
          </p>
          <button
            onclick="window.location.reload()"
            class="px-4 py-2 bg-orange-500 rounded hover:bg-orange-600"
          >
            Reload Page
          </button>
          ${process.env.NODE_ENV === 'development' ? `
            <details class="mt-6 text-left">
              <summary class="cursor-pointer text-sm text-gray-500">
                Error details
              </summary>
              <pre class="mt-2 p-4 bg-gray-800 rounded text-xs overflow-auto">
                ${this.error?.toString()}
                ${this.errorInfo ? '\n\n' + this.errorInfo : ''}
              </pre>
            </details>
          ` : ''}
        </div>
      </div>
    `
  }
}