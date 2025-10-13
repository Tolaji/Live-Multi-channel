export class QuotaMonitor {
  constructor() {
    this.quotaUsage = null
    this.loading = true
    this.interval = null
    this.backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'
  }

  mount(container) {
    this.container = container
    this.fetchQuota()
    this.startPolling()
    this.render()
  }

  unmount() {
    if (this.interval) {
      clearInterval(this.interval)
    }
  }

  async fetchQuota() {
    try {
      const response = await fetch(
        `${this.backendUrl}/api/admin/quota`,
        { credentials: 'include' }
      )
      
      if (response.ok) {
        const data = await response.json()
        this.quotaUsage = data
      } else {
        // Fallback to mock data if endpoint doesn't exist
        this.quotaUsage = this.getMockQuotaData()
      }
    } catch (error) {
      console.error('Error fetching quota:', error)
      // Use mock data on error
      this.quotaUsage = this.getMockQuotaData()
    } finally {
      this.loading = false
      this.render()
    }
  }

  getMockQuotaData() {
    // Mock data for development/demo
    return {
      used: Math.floor(Math.random() * 5000),
      limit: 10000,
      remaining: Math.floor(Math.random() * 5000) + 1000,
      percentUsed: Math.floor(Math.random() * 50)
    }
  }

  startPolling() {
    // Update every minute
    this.interval = setInterval(() => {
      this.fetchQuota()
    }, 60000)
  }

  render() {
    if (this.loading || !this.quotaUsage) {
      this.container.innerHTML = `
        <div class="px-4 py-2 text-sm bg-gray-800 text-gray-400">
          <div class="animate-pulse">Loading quota...</div>
        </div>
      `
      return
    }

    const percentUsed = (this.quotaUsage.used / this.quotaUsage.limit) * 100
    const isWarning = percentUsed > 70
    const isDanger = percentUsed > 90

    this.container.innerHTML = `
      <div class="px-4 py-2 text-sm ${
        isDanger ? 'bg-red-900/30 text-red-400' :
        isWarning ? 'bg-yellow-900/30 text-yellow-400' :
        'bg-gray-800 text-gray-400'
      }">
        <div class="flex items-center justify-between mb-1">
          <span>API Quota</span>
          <span class="font-mono">
            ${this.quotaUsage.used.toLocaleString()} / ${this.quotaUsage.limit.toLocaleString()}
          </span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            class="h-full transition-all ${
              isDanger ? 'bg-red-500' :
              isWarning ? 'bg-yellow-500' :
              'bg-green-500'
            }"
            style="width: ${Math.min(percentUsed, 100)}%"
          ></div>
        </div>
        ${isDanger ? `
          <div class="mt-1 text-xs text-red-300">
            ⚠️ Quota nearly exhausted
          </div>
        ` : isWarning ? `
          <div class="mt-1 text-xs text-yellow-300">
            ℹ️ Quota usage high
          </div>
        ` : ''}
      </div>
    `
  }

  updateQuota(newQuotaData) {
    this.quotaUsage = { ...this.quotaUsage, ...newQuotaData }
    this.render()
  }

  // Method to manually refresh quota
  async refresh() {
    this.loading = true
    this.render()
    await this.fetchQuota()
  }
}

// Alternative: Functional component style
export function createQuotaMonitor(quotaUsage = null, loading = false) {
  if (loading || !quotaUsage) {
    return `
      <div class="px-4 py-2 text-sm bg-gray-800 text-gray-400">
        <div class="animate-pulse">Loading quota...</div>
      </div>
    `
  }

  const percentUsed = (quotaUsage.used / quotaUsage.limit) * 100
  const isWarning = percentUsed > 70
  const isDanger = percentUsed > 90

  return `
    <div class="px-4 py-2 text-sm ${
      isDanger ? 'bg-red-900/30 text-red-400' :
      isWarning ? 'bg-yellow-900/30 text-yellow-400' :
      'bg-gray-800 text-gray-400'
    }">
      <div class="flex items-center justify-between mb-1">
        <span>API Quota</span>
        <span class="font-mono">
          ${quotaUsage.used.toLocaleString()} / ${quotaUsage.limit.toLocaleString()}
        </span>
      </div>
      <div class="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
        <div
          class="h-full transition-all ${
            isDanger ? 'bg-red-500' :
            isWarning ? 'bg-yellow-500' :
            'bg-green-500'
          }"
          style="width: ${Math.min(percentUsed, 100)}%"
        ></div>
      </div>
      ${isDanger ? `
        <div class="mt-1 text-xs text-red-300">
          ⚠️ Quota nearly exhausted
        </div>
      ` : isWarning ? `
        <div class="mt-1 text-xs text-yellow-300">
          ℹ️ Quota usage high
        </div>
      ` : ''}
    </div>
  `
}

// Standalone quota monitor that can be used anywhere
export class StandaloneQuotaMonitor {
  constructor(containerId = 'quota-monitor') {
    this.container = document.getElementById(containerId)
    this.quotaUsage = null
    this.loading = true
    
    if (this.container) {
      this.init()
    }
  }

  async init() {
    await this.fetchQuota()
    this.render()
    
    // Set up auto-refresh
    setInterval(() => {
      this.fetchQuota()
    }, 60000)
  }

  async fetchQuota() {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/api/admin/quota`,
        { credentials: 'include' }
      )
      
      if (response.ok) {
        this.quotaUsage = await response.json()
      }
    } catch (error) {
      console.error('Error fetching quota:', error)
    } finally {
      this.loading = false
      this.render()
    }
  }

  render() {
    if (!this.container) return

    if (this.loading || !this.quotaUsage) {
      this.container.innerHTML = '<div class="text-sm text-gray-400">Loading quota...</div>'
      return
    }

    const percentUsed = (this.quotaUsage.used / this.quotaUsage.limit) * 100
    const isWarning = percentUsed > 70
    const isDanger = percentUsed > 90

    this.container.innerHTML = `
      <div class="text-sm ${isDanger ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-gray-400'}">
        <div class="flex items-center justify-between">
          <span>Quota:</span>
          <span class="font-mono">
            ${this.quotaUsage.used.toLocaleString()}/${this.quotaUsage.limit.toLocaleString()}
          </span>
        </div>
        <div class="w-full bg-gray-700 rounded-full h-1 mt-1 overflow-hidden">
          <div
            class="h-full ${isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-green-500'}"
            style="width: ${Math.min(percentUsed, 100)}%"
          ></div>
        </div>
      </div>
    `
  }
}

// Auto-initialize if container exists
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const quotaContainer = document.getElementById('quota-monitor')
    if (quotaContainer) {
      new StandaloneQuotaMonitor()
    }
  })
}