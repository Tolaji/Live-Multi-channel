// Client-side encryption for secure transmission (optional)
// Note: For maximum security, consider end-to-end encryption
// This is a basic example using base64 encoding

export function encryptForTransmission(data) {
  // Simple base64 encoding for demo
  // In production, use proper encryption for sensitive data
  return btoa(JSON.stringify(data))
}

export function decryptReceivedData(encryptedData) {
  try {
    return JSON.parse(atob(encryptedData))
  } catch {
    return null
  }
}

// Optional: Generate a device fingerprint for additional security
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