// backend/middleware/security.js
// PRODUCTION-READY CORS configuration

import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

// Rate limiting configurations
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    error: 'Too many requests from this IP, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    return req.path === '/health' || req.path.startsWith('/webhooks/');
  }
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'AUTH_RATE_LIMIT'
  },
  skipSuccessfulRequests: true
});

export const webhookLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 50,
  message: {
    error: 'Too many webhook requests',
    code: 'WEBHOOK_RATE_LIMIT'
  }
});

// Helmet security headers
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
          "https://live-multi-channel.vercel.app",
          "https://live-multi-channel.onrender.com",
          "http://localhost:5173",
          "http://localhost:3000"
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
    crossOriginEmbedderPolicy: false
  }));
}

// Validation helpers
export function validateChannelId(channelId) {
  const pattern = /^UC[\w-]{22}$/;
  return pattern.test(channelId);
}

export function validateVideoId(videoId) {
  const pattern = /^[\w-]{11}$/;
  return pattern.test(videoId);
}

// CRITICAL: Production-ready CORS configuration
export const corsOptions = {
  origin: function (origin, callback) {
    // Define allowed origins based on environment
    const allowedOrigins = [
      'https://live-multi-channel.vercel.app',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

    // IMPORTANT: Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin');
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Allowed origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`🚫 CORS: Blocked origin: ${origin}`);
      
      // In development, be more permissive
      if (process.env.NODE_ENV === 'development') {
        console.log('⚠️ DEV MODE: Allowing blocked origin anyway');
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true, // CRITICAL: Allow cookies and authorization headers
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-CSRF-Token',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['Set-Cookie'],
  maxAge: 600 // Cache preflight requests for 10 minutes
};

// SQL injection prevention
export async function safeQuery(db, query, params) {
  try {
    return await db.query(query, params);
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error('Database operation failed');
  }
}

// XSS protection middleware
export function xssProtection(req, res, next) {
  if (req.body) {
    for (let key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key]
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
      }
    }
  }
  next();
}

// Enhanced request logging
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log request immediately
  console.log(`➡️  ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';
    const emoji = res.statusCode >= 400 ? '❌' : '✅';
    
    console.log(
      `${emoji} ${logLevel} - ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms - IP: ${req.ip}`
    );
  });
  
  next();
}