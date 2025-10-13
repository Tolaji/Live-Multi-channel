// hooks/useKeyboardShortcuts.js

import { useEffect } from 'react';

export function useKeyboardShortcuts(handlers) {
  useEffect(() => {
    function handleKeyDown(event) {
      // Don't trigger if user is typing in input
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      
      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;
      
      // Define shortcuts
      if (ctrl && key === 'k') {
        event.preventDefault();
        handlers.openSearch?.();
      } else if (key === 'r') {
        event.preventDefault();
        handlers.refresh?.();
      } else if (key === 'c') {
        event.preventDefault();
        handlers.toggleChat?.();
      } else if (key === 'escape') {
        handlers.closeModals?.();
      } else if (key === 'arrowup') {
        event.preventDefault();
        handlers.previousChannel?.();
      } else if (key === 'arrowdown') {
        event.preventDefault();
        handlers.nextChannel?.();
      }
    }
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
