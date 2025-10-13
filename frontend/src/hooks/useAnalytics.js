// hooks/useAnalytics.js

export function useAnalytics() {
  const trackEvent = (category, action, label, value) => {
    // Send to backend for logging
    fetch('/api/analytics/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        category,
        action,
        label,
        value,
        timestamp: new Date().toISOString()
      })
    }).catch(console.error)
    
    // Also send to Google Analytics if configured
    if (window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value
      })
    }
  }
  
  const trackPageView = (path) => {
    trackEvent('Navigation', 'page_view', path)
  }
  
  const trackChannelView = (channelId, channelTitle) => {
    trackEvent('Channel', 'view', channelTitle)
  }
  
  const trackLiveStreamWatch = (videoId, channelTitle, duration) => {
    trackEvent('Stream', 'watch', channelTitle, duration)
  }
  
  return {
    trackEvent,
    trackPageView,
    trackChannelView,
    trackLiveStreamWatch
  }
}