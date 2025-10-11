// backend/middleware/csrf.js

import csrf from 'csurf';

export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Add CSRF token to all forms
export function injectCSRFToken(req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
}