// backend/middleware/csrf.js

import csrf from 'csurf';

// CSRF protection configuration
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000 // 1 hour
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'], // Safe methods don't need CSRF
  value: (req) => {
    // Get token from header or body
    return req.headers['x-csrf-token'] || req.body._csrf;
  }
});

// Add CSRF token to responses
export function injectCSRFToken(req, res, next) {
  try {
    // Only add CSRF token for non-API routes or specific endpoints
    if (!req.path.startsWith('/api/') || req.path === '/api/auth/csrf-token') {
      res.locals.csrfToken = req.csrfToken();
    }
    next();
  } catch (error) {
    // CSRF token generation failed, continue without it
    console.warn('CSRF token generation failed:', error.message);
    next();
  }
}

// CSRF error handler
export function csrfErrorHandler(error, req, res, next) {
  if (error.code !== 'EBADCSRFTOKEN') return next(error);
  
  console.warn('CSRF token validation failed for:', req.method, req.path);
  
  res.status(403).json({
    error: 'Invalid CSRF token',
    code: 'INVALID_CSRF_TOKEN',
    message: 'Your session has expired. Please refresh the page and try again.'
  });
}

// Generate CSRF token for API clients
export function getCSRFToken(req, res) {
  res.json({
    csrfToken: req.csrfToken(),
    timestamp: new Date().toISOString()
  });
}