// backend/routes/auth.js
// PRODUCTION-READY authentication with proper error handling

import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const router = express.Router();

// Initialize OAuth2 client with validation
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Validate OAuth configuration on startup
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.error('❌ CRITICAL: Google OAuth credentials not configured!');
  console.error('   Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

// Helper: Determine frontend URL based on environment
function getFrontendUrl() {
  if (process.env.NODE_ENV === 'production') {
    return 'https://live-multi-channel.vercel.app';
  }
  return process.env.FRONTEND_URL || 'http://localhost:5173';
}

// Step 1: Redirect to Google OAuth
router.get('/login', (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'openid',
        'https://www.googleapis.com/auth/userinfo.profile',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent' // Force consent screen to get refresh token
    });
    
    console.log('🔐 [Auth] Redirecting to Google OAuth');
    res.redirect(authUrl);
    
  } catch (error) {
    console.error('❌ [Auth] Login redirect error:', error);
    const frontendUrl = getFrontendUrl();
    res.redirect(`${frontendUrl}/?auth_error=oauth_config_error`);
  }
});

// Step 2: Handle OAuth callback
router.get('/callback', async (req, res) => {
  const { code, error: oauthError } = req.query;
  const frontendUrl = getFrontendUrl();
  
  // Handle OAuth errors from Google
  if (oauthError) {
    console.error('❌ [Auth] OAuth error from Google:', oauthError);
    return res.redirect(`${frontendUrl}/?auth_error=google_${oauthError}`);
  }
  
  if (!code) {
    console.error('❌ [Auth] No authorization code received');
    return res.redirect(`${frontendUrl}/?auth_error=no_code`);
  }
  
  try {
    console.log('🔐 [Auth] Exchanging code for tokens...');
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    if (!tokens.id_token) {
      throw new Error('No ID token received from Google');
    }
    
    console.log('✅ [Auth] Tokens received, verifying...');
    
    // Verify ID token and get user info
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    
    if (!payload || !payload.sub) {
      throw new Error('Invalid token payload');
    }
    
    const googleUserId = payload.sub;
    const userEmail = payload.email;
    const userName = payload.name;
    const userPicture = payload.picture;
    
    console.log(`✅ [Auth] User verified: ${userEmail}`);
    
    // Store/update user in database
    const result = await db.query(
      `INSERT INTO users (google_id, email, name, picture) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (google_id) 
       DO UPDATE SET 
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         picture = EXCLUDED.picture,
         updated_at = NOW()
       RETURNING id, google_id, email, name, picture`,
      [googleUserId, userEmail, userName, userPicture]
    );
    
    const user = result.rows[0];
    
    if (!user) {
      throw new Error('Failed to create/retrieve user from database');
    }
    
    console.log(`✅ [Auth] User stored in DB: ID ${user.id}`);
    
    // Generate JWT token with proper expiration
    const jwtToken = jwt.sign(
      { 
        userId: user.id,
        googleId: user.google_id,
        email: user.email,
        name: user.name,
        iat: Math.floor(Date.now() / 1000)
      },
      process.env.SESSION_SECRET,
      { 
        expiresIn: '7d',
        issuer: 'live-multi-channel',
        audience: 'live-multi-channel-frontend'
      }
    );
    
    console.log(`✅ [Auth] JWT generated for user: ${user.email}`);
    
    // Redirect to frontend with token
    const redirectUrl = `${frontendUrl}/?token=${jwtToken}&login=success`;
    // CRITICAL: Log the exact redirect URL (without exposing full token)
        console.log('✅ [Auth] Redirecting to frontend:', {
          url: redirectUrl.substring(0, 60) + '...',
          tokenLength: jwtToken.length,
          frontendUrl
        });    
    // res.redirect(redirectUrl);

    // Add explicit headers to prevent caching/interception
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.redirect(307, redirectUrl); // 307 = Temporary Redirect (preserve method)
    
  } catch (error) {
    console.error('❌ [Auth] Callback error:', error);
    
    // Determine specific error type
    let errorCode = 'auth_failed';
    
    if (error.message.includes('token')) {
      errorCode = 'token_error';
    } else if (error.message.includes('database')) {
      errorCode = 'db_error';
    }
    
    res.redirect(`${frontendUrl}/?auth_error=${errorCode}`);
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  console.log('🚪 [Auth] User logged out');
  
  res.json({ 
    success: true, 
    message: 'Logged out successfully'
  });
});

// Session verification endpoint
router.get('/session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        authenticated: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify JWT with proper options
    const decoded = jwt.verify(token, process.env.SESSION_SECRET, {
      issuer: 'live-multi-channel',
      audience: 'live-multi-channel-frontend'
    });
    
    // Verify user still exists in database
    const userResult = await db.query(
      'SELECT id, google_id, email, name, picture FROM users WHERE id = $1',
      [decoded.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({
        authenticated: false,
        message: 'User not found'
      });
    }
    
    const user = userResult.rows[0];
    
    // Return session data
    res.json({
      authenticated: true,
      userId: user.google_id,
      userDbId: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture
    });
    
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        authenticated: false,
        message: 'Token expired'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        authenticated: false,
        message: 'Invalid token'
      });
    }
    
    console.error('[Auth] Session verification error:', error);
    res.status(500).json({
      authenticated: false,
      message: 'Session verification failed'
    });
  }
});

// Health check endpoint for auth routes
router.get('/health', (req, res) => {
  const hasConfig = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  
  res.json({
    status: hasConfig ? 'ok' : 'misconfigured',
    oauthConfigured: hasConfig,
    redirectUri: process.env.GOOGLE_REDIRECT_URI
  });
});

export default router;