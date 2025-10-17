// frontend/src/core/Router.js

export class Router {
  constructor() {
    this.routes = [];
    this.currentPath = window.location.pathname;
  }

  addRoute(path, handler) {
    this.routes.push({ path, handler });
  }

  handleRoute() {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.replace('#', ''));
    
    // Check for JWT token from OAuth redirect
    const token = urlParams.get('token');
    if (token) {
      this.handleTokenLogin(token);
      return;
    }
    
    // Check for auth errors
    const authError = urlParams.get('auth_error') || hashParams.get('auth_error');
    if (authError) {
      this.handleAuthError(authError);
      return;
    }
    
    // Check for login success
    const loginSuccess = urlParams.get('login') === 'success';
    if (loginSuccess) {
      this.handleLoginSuccess();
      return;
    }

    const currentRoute = this.routes.find(route => 
      route.path === '*' || route.path === this.currentPath
    );
    
    if (currentRoute) {
      currentRoute.handler();
    }
  }

  handleTokenLogin(token) {
  console.log('[Router] JWT token received, storing...');
  
  // Store JWT in localStorage
  localStorage.setItem('auth_token', token);
  
  // Show success toast
  if (window.toast) {
    window.toast.show('Successfully signed in!', 'success');
  }
  
  // Clean URL and reload to initialize RSS mode
  this.cleanUrl();
  
  // Small delay to ensure toast is visible
  setTimeout(() => {
    window.location.reload();
  }, 1000);
}

  handleAuthError(errorType) {
    console.log('[Router] Auth error detected:', errorType);
    
    // Show error toast
    if (window.toast) {
      let message = 'Authentication failed';
      if (errorType === 'auth_failed') {
        message = 'Google authentication failed. Please try again.';
      }
      window.toast.show(message, 'error');
    }
    
    // Clean URL
    this.cleanUrl();
  }

  handleLoginSuccess() {
    console.log('[Router] Login success detected');
    
    // Show success toast
    if (window.toast) {
      window.toast.show('Successfully signed in!', 'success');
    }
    
    // Clean URL and reload
    this.cleanUrl();
    window.location.reload();
  }

  cleanUrl() {
    // Remove query parameters from URL without reloading
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  start() {
    // Handle initial route
    this.handleRoute();
    
    // Listen for URL changes
    window.addEventListener('popstate', () => {
      this.currentPath = window.location.pathname;
      this.handleRoute();
    });
  }
}