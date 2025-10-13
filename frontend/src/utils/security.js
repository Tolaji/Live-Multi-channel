// utils/security.js

// Generate device-specific encryption key
// Security utilities for browser environment
export function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset()
  ]
  
  return btoa(components.join('|'))
}

export function isValidYouTubeAPIKey(key) {
  const pattern = /^[A-Za-z0-9_-]{39}$/
  return pattern.test(key)
}

export function sanitizeAPIKey(key) {
  if (!key || key.length < 12) return '****'
  return `${key.slice(0, 4)}...${key.slice(-4)}`
}