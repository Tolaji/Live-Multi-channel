// backend/routes/auth.js

import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import db from '../config/database.js';

const router = express.Router();
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Step 1: Redirect to Google
router.get('/login', (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'openid',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/userinfo.email'
    ]
  });
  
  res.redirect(authUrl);
});

// Step 2: Handle callback
router.get('/callback', async (req, res) => {
  const { code } = req.query;
  
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Get user info
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    const userId = payload['sub'];
    
    // Store user in DB
    const result = await db.query(
      `INSERT INTO users (google_id, email, name, picture) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (google_id) DO UPDATE 
       SET email = $2, name = $3, picture = $4, updated_at = NOW()
       RETURNING id, google_id, email, name, picture`,
      [userId, payload.email, payload.name, payload.picture]
    );
    
    const user = result.rows[0];
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id,
        googleId: user.google_id,
        email: user.email,
        name: user.name
      },
      process.env.SESSION_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log(`✅ User logged in: ${user.email} (ID: ${user.id})`);
    
    // Redirect to appropriate frontend URL
    const frontendUrl = process.env.NODE_ENV === 'production' 
      ? 'https://live-multi-channel.vercel.app'
      : 'http://localhost:5173';
    
    res.redirect(`${frontendUrl}/?token=${token}&login=success`);
    
  } catch (error) {
    console.error('Auth error:', error);
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://live-multi-channel.vercel.app'
      : 'http://localhost:5173';
    res.redirect(`${frontendUrl}/?auth_error=auth_failed`);
  }
});

// Logout route (just clears token on frontend)
router.post('/logout', (req, res) => {
  // With JWT, logout is handled on frontend by removing token
  // This endpoint just confirms the logout request
  console.log('User logged out via simple-logout endpoint');
  res.json({ 
    success: true, 
    message: 'Logged out successfully (JWT token should be removed from client)' 
  });
});

// Verify token and get user session
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
    
    // Verify JWT
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    
    // Return user session data
    res.json({
      authenticated: true,
      userId: decoded.googleId,
      userDbId: decoded.userId,
      email: decoded.email,
      name: decoded.name
    });
    
  } catch (error) {
    console.error('Token verification failed:', error.message);
    res.status(401).json({
      authenticated: false,
      message: 'Invalid or expired token'
    });
  }
});

export default router;