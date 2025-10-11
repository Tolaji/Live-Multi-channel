// backend/middleware/security.js

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // More strict for auth endpoints
  skipSuccessfulRequests: true
});

// Helmet for security headers
export function configureHelmet(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: ["'self'", "https://www.googleapis.com"],
        frameSrc: ["https://www.youtube.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));
}

// Input validation
export function validateChannelId(channelId) {
  // YouTube channel IDs start with UC and are 24 chars
  const pattern = /^UC[\w-]{22}$/;
  return pattern.test(channelId);
}

export function validateVideoId(videoId) {
  // YouTube video IDs are 11 characters
  const pattern = /^[\w-]{11}$/;
  return pattern.test(videoId);
}

// SQL injection prevention (parameterized queries example)
export async function safeQuery(db, query, params) {
  // Always use parameterized queries, never string concatenation
  try {
    return await db.query(query, params);
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error('Database operation failed');
  }
}