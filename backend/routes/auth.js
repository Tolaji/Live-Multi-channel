// // backend/routes/auth.js

// import express from 'express';
// import db from '../config/database.js';
// import { OAuth2Client } from 'google-auth-library';

// import session from 'express-session';
// import RedisStore from 'connect-redis';

// // Add after Redis import
// app.use(session({
//   store: new RedisStore({ client: redis }),
//   secret: process.env.SESSION_SECRET,
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     secure: process.env.NODE_ENV === 'production',
//     httpOnly: true,
//     maxAge: 24 * 60 * 60 * 1000 // 24 hours
//   }
// }));

// const router = express.Router();
// const oauth2Client = new OAuth2Client(
//   process.env.GOOGLE_CLIENT_ID,
//   process.env.GOOGLE_CLIENT_SECRET,
//   process.env.GOOGLE_REDIRECT_URI
// );

// // Step 1: Redirect to Google
// router.get('/login', (req, res) => {
//   const authUrl = oauth2Client.generateAuthUrl({
//     access_type: 'offline',
//     scope: [
//       'openid',
//       'https://www.googleapis.com/auth/userinfo.profile',
//       'https://www.googleapis.com/auth/userinfo.email'
//     ]
//   });
  
//   res.redirect(authUrl);
// });

// // Step 2: Handle callback
// router.get('/callback', async (req, res) => {
//   const { code } = req.query;
  
//   try {
//     const { tokens } = await oauth2Client.getToken(code);
//     oauth2Client.setCredentials(tokens);
    
//     // Get user info
//     const ticket = await oauth2Client.verifyIdToken({
//       idToken: tokens.id_token,
//       audience: process.env.GOOGLE_CLIENT_ID
//     });
    
//     const payload = ticket.getPayload();
//     const userId = payload['sub'];
    
//     // Store user in DB
//     await db.query(
//       `INSERT INTO users (google_id, email, name, picture) 
//        VALUES ($1, $2, $3, $4) 
//        ON CONFLICT (google_id) DO UPDATE 
//        SET email = $2, name = $3, picture = $4`,
//       [userId, payload.email, payload.name, payload.picture]
//     );
    
//     // Create session
//     req.session.userId = userId;
    
//     res.redirect('/dashboard');
    
//   } catch (error) {
//     console.error('Auth error:', error);
//     res.redirect('/login?error=auth_failed');
//   }
// });

// export default router;

// backend/routes/auth.js

import express from 'express';
import { OAuth2Client } from 'google-auth-library';
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
    
    // Create session
    req.session.userId = user.google_id;
    req.session.userDbId = user.id; // Store database ID for easy access
    
    console.log(`✅ User logged in: ${user.email} (ID: ${user.id})`);
    
    // Redirect to frontend with success
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/dashboard?login=success`);
    
  } catch (error) {
    console.error('Auth error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Redirect to the root (mode selector) with error in hash or query param
    res.redirect(`${frontendUrl}/?auth_error=auth_failed`);
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

// Get current user session
router.get('/session', (req, res) => {
  if (req.session.userId) {
    res.json({
      authenticated: true,
      userId: req.session.userId,
      userDbId: req.session.userDbId
    });
  } else {
    res.status(401).json({
      authenticated: false,
      message: 'Not authenticated'
    });
  }
});

export default router;