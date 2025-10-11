// utils/security.js

// Generate device-specific encryption key
export function generateDeviceFingerprint() {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    new Date().getTimezoneOffset()
  ];
  
  return btoa(components.join('|'));
}

// Validate API key format before storage
export function isValidYouTubeAPIKey(key) {
  // YouTube API keys are 39 characters, alphanumeric
  const pattern = /^[A-Za-z0-9_-]{39}$/;
  return pattern.test(key);
}

// Sanitize API key for logging (show only first/last 4 chars)
export function sanitizeAPIKey(key) {
  if (!key || key.length < 12) return '****';
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}