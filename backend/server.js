// backend/server.js - Add exports at the end
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import http from 'http';
import { Server as SocketIO } from 'socket.io';
import passport from 'passport';

import session from 'express-session';
import { createClient } from 'redis';
import { RedisStore } from 'connect-redis';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';  


// Import configurations
import db from './config/database.js';
// import redis from './config/redis.js'; // Remove this since we're creating a new client

// Import middleware
import { 
  configureHelmet, 
  apiLimiter, 
  authLimiter, 
  requestLogger,
  corsOptions 
} from './middleware/security.js';
import { 
  csrfProtection, 
  injectCSRFToken, 
  csrfErrorHandler 
} from './middleware/csrf.js';
import { socketAuth } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import webhookRoutes from './routes/webhooks.js';
import healthRoutes from './routes/health.js';
import userRoutes from './routes/user.js';
import userChannelsRoutes from './routes/userChannels.js'; 


// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup - make it available for export
export const io = new SocketIO(server, { 
  cors: corsOptions
});

import socketService from './services/socketService.js';

socketService.setIO(io);

const PORT = process.env.PORT || 3000;

// ========================================
// Trust Proxy
// ========================================
// This MUST come BEFORE any middleware
const trustProxy = process.env.TRUST_PROXY === 'true' || 
                   process.env.NODE_ENV === 'production';

if (trustProxy) {
  app.set('trust proxy', 1); // Trust first proxy (Render/Vercel)
  console.log('✅ Trust proxy: ENABLED');
} else {
  app.set('trust proxy', false);
  console.log('⚠️ Trust proxy: DISABLED (development)');
}

// ========== MIDDLEWARE SETUP ==========

// Security middleware
configureHelmet(app);
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now (can enable later)
  crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create Redis client for sessions
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) return new Error('Redis reconnection failed');
      return Math.min(retries * 50, 500);
    }
  }
});

// Initialize Redis client
(async () => {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected for sessions');
  } catch (error) {
    console.error('❌ Failed to connect Redis for sessions:', error);
  }
})();

app.use(cookieParser());

// Session configuration
// In backend/server.js - update the session config
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'lmc.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true in production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-site
    domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Don't set domain
  },
  proxy: true // Trust proxy in production
}));

// ========================================
// Rate Limiting
// ========================================
app.use(apiLimiter);
app.use('/auth', authLimiter);

// Configure rate limiter to work with proxies
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  // ✅ Key generator that works with proxies
  keyGenerator: (req) => {
    // Use X-Forwarded-For if available, otherwise req.ip
    return req.headers['x-forwarded-for']?.split(',')[0] || req.ip;
  },
  skip: (req) => {
    // Skip rate limiting for health checks and webhooks
    return req.path === '/health' || req.path.startsWith('/webhooks/');
  }
});

app.use(limiter);

// CSRF protection - ONLY for non-API routes, EXCEPT /api/csrf-token
const csrfMiddleware = (req, res, next) => {
  // Allow CSRF protection for /api/csrf-token
  if (
    req.path === '/api/csrf-token'
  ) {
    return csrfProtection(req, res, next);
  }
  // Skip CSRF for other API routes, webhooks, and health checks
  if (
    req.path.startsWith('/api/') ||
    req.path.startsWith('/webhooks/') ||
    req.path === '/health'
  ) {
    return next();
  }
  return csrfProtection(req, res, next);
};

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

app.use(csrfMiddleware);
app.use(injectCSRFToken);

// ========== ROUTE REGISTRATION ==========

// Public routes (no auth required)
app.use('/health', healthRoutes);
app.use('/webhooks', webhookRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Live Multi-Channel API',
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.use('/auth', authRoutes);

// API routes (require auth)
app.use('/api', apiRoutes);
app.use('/api/user', userRoutes)
app.use('/api/user/channels', userChannelsRoutes);

// CSRF token endpoint for frontend
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// ========== SOCKET.IO SETUP ==========

// Socket authentication
io.use(socketAuth);

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  // Join user-specific room when authenticated
  socket.on('user:authenticate', (userId) => {
    socket.join(`user:${userId}`);
    console.log(`User ${userId} joined their room`);
  });
  
  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`🔌 Client disconnected: ${socket.id} - Reason: ${reason}`);
  });
  
  // Test event
  socket.emit('welcome', { 
    message: 'Connected to Live Multi-Channel server',
    timestamp: new Date().toISOString()
  });
});

// ========== ERROR HANDLING ==========

// CSRF error handler
app.use(csrfErrorHandler);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Don't leak error details in production
  const errorResponse = {
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  };
  
  if (process.env.NODE_ENV === 'development') {
    errorResponse.message = err.message;
    errorResponse.stack = err.stack;
  }
  
  res.status(500).json(errorResponse);
});

// ========== SERVER STARTUP ==========

// Start server
server.listen(PORT, () => {
  console.log('\n🚀 ================================');
  console.log(`   Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log('🚀 ================================\n');
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`🗄️  Database test: http://localhost:${PORT}/api/test/db`);
  console.log(`🔴 Redis test: http://localhost:${PORT}/api/test/redis`);
  console.log(`🔐 CSRF token: http://localhost:${PORT}/api/csrf-token`);
  console.log(`🔐 Auth: http://localhost:${PORT}/auth/login`);
  console.log(`🏠 API Root: http://localhost:${PORT}/`);
  console.log('\n');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    console.log('✅ HTTP server closed');
    await db.end();
    console.log('✅ Database connection closed');
    await redisClient.quit();
    console.log('✅ Redis connection closed');
    process.exit(0);
  });
});
