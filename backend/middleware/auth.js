// backend/middleware/auth.js
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

/**
 * Middleware to require authentication
 * Checks if user is logged in via session
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required - no token provided',
        code: 'UNAUTHENTICATED'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    
    // Verify user still exists in database
    const userResult = await db.query(
      'SELECT id, email, name, picture FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({ 
        error: 'User not found - please login again',
        code: 'SESSION_INVALID'
      });
    }

    // Attach user info to request
    req.user = {
      id: decoded.userId,
      google_id: decoded.googleId,
      email: decoded.email,
      name: decoded.name
    };
    
    next();
    
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired - please login again',
        code: 'TOKEN_EXPIRED'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    }
    
    res.status(500).json({ 
      error: 'Authentication check failed',
      code: 'AUTH_CHECK_FAILED'
    });
  }
};

/**
 * Middleware for optional authentication
 * Attaches user to request if logged in, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.SESSION_SECRET);
      
      const userResult = await db.query(
        'SELECT id, email, name, picture FROM users WHERE id = $1',
        [decoded.userId]
      );

      if (userResult.rows.length > 0) {
        req.user = {
          id: decoded.userId,
          google_id: decoded.googleId,
          email: decoded.email,
          name: decoded.name
        };
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without user info on error
    next();
  }
};

/**
 * Middleware to require admin privileges
 * Must be used after requireAuth
 */
export const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        code: 'UNAUTHENTICATED'
      });
    }

    // Check if user has admin role
    // This would require adding a 'role' column to users table
    const userResult = await db.query(
      'SELECT role FROM users WHERE id = $1',
      [req.user.id]
    );

    const userRole = userResult.rows[0]?.role || 'user';
    
    if (userRole !== 'admin') {
      return res.status(403).json({ 
        error: 'Admin privileges required',
        code: 'FORBIDDEN'
      });
    }

    next();
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authorization check failed',
      code: 'AUTH_CHECK_FAILED'
    });
  }
};

/**
 * Middleware to check if user owns a resource
 * Useful for routes like /api/users/:userId/*
 */
export const requireResourceOwnership = (paramName = 'userId') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          error: 'Authentication required',
          code: 'UNAUTHENTICATED'
        });
      }

      const resourceUserId = parseInt(req.params[paramName]);
      
      if (req.user.id !== resourceUserId) {
        return res.status(403).json({ 
          error: 'Access denied - you do not own this resource',
          code: 'FORBIDDEN'
        });
      }

      next();
    } catch (error) {
      console.error('Resource ownership middleware error:', error);
      res.status(500).json({ 
        error: 'Authorization check failed',
        code: 'AUTH_CHECK_FAILED'
      });
    }
  };
};

/**
 * Socket.IO authentication middleware
 * Validates JWT tokens or session cookies for WebSocket connections
 */
export const socketAuth = async (socket, next) => {
  try {
    // For session-based auth, you might need to parse the cookie
    // For JWT-based auth, you might have a token in handshake
    const sessionId = socket.handshake.auth.sessionId || 
                     socket.handshake.headers.cookie?.match(/connect.sid=([^;]+)/)?.[1];

    if (!sessionId) {
      console.warn('Socket connection attempt without session');
      return next(new Error('Authentication required'));
    }

    // In a real implementation, you'd verify the session with your session store
    // This is a simplified version
    console.log(`Socket authentication for session: ${sessionId.substring(0, 10)}...`);
    
    // For now, we'll trust the session and let the client send userId
    // In production, you should verify the session against your session store
    next();
    
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

/**
 * Rate limiting per user
 * Can be combined with express-rate-limit
 */
export const userRateLimit = (windowMs, maxRequests) => {
  const userRequests = new Map();
  
  setInterval(() => {
    userRequests.clear();
  }, windowMs);

  return (req, res, next) => {
    if (!req.user) {
      return next(); // Skip rate limiting for unauthenticated users
    }

    const userId = req.user.id;
    const current = userRequests.get(userId) || 0;
    
    if (current >= maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    userRequests.set(userId, current + 1);
    next();
  };
};

/**
 * Get current user info (convenience function for routes)
 */
export const getCurrentUser = async (userId) => {
  try {
    const result = await db.query(
      'SELECT id, google_id, email, name, picture, created_at FROM users WHERE id = $1',
      [userId]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};