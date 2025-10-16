// backend/middleware/security.js

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rate limiting
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and webhooks
    return req.path === '/health' || req.path.startsWith('/webhooks/');
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // More strict for auth endpoints
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT'
  },
  skipSuccessfulRequests: true
});

export const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // Webhooks can be more frequent
  message: {
    error: 'Too many webhook requests',
    code: 'WEBHOOK_RATE_LIMIT'
  }
});

// Helmet for security headers
export function configureHelmet(app) {
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://www.youtube.com", "https://apis.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: [
          "'self'",
          "https://www.googleapis.com",
          "https://pubsubhubbub.appspot.com",
          process.env.FRONTEND_URL,
          "https://live-multi-channel.onrender.com"
        ],

        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        frameSrc: ["https://www.youtube.com", "https://accounts.google.com"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    crossOriginEmbedderPolicy: false // Required for YouTube embeds
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

// CORS configuration
// backend/middleware/security.js
export const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173',
      'http://localhost:3000',
      'https://live-multi-channel.onrender.com',
      'https://live-multi-channel.vercel.app'
    ];

    // Allow requests with no origin (like curl, mobile apps, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`🚫 Blocked CORS request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // important for cookies/session
  optionsSuccessStatus: 200
};


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

// XSS protection middleware
export function xssProtection(req, res, next) {
  // Basic XSS protection by sanitizing user input
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
    }
  }
  next();
}

// Request logging middleware (enhanced)
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';
    console.log(`${new Date().toISOString()} - ${logLevel} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
  });
  
  next();
}