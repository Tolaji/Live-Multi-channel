// backend/routes/auth.js

import express from 'express';
import { OAuth2Client } from 'google-auth-library';

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
    await db.query(
      `INSERT INTO users (google_id, email, name, picture) 
       VALUES ($1, $2, $3, $4) 
       ON CONFLICT (google_id) DO UPDATE 
       SET email = $2, name = $3, picture = $4`,
      [userId, payload.email, payload.name, payload.picture]
    );
    
    // Create session
    req.session.userId = userId;
    
    res.redirect('/dashboard');
    
  } catch (error) {
    console.error('Auth error:', error);
    res.redirect('/login?error=auth_failed');
  }
});

export default router;