// backend/routes/api.js

import express from 'express';
import { subscribeToChannel, unsubscribeFromChannel } from '../services/rssFeedService.js';
import { searchChannelForLiveStreams } from '../services/youtubeService.js';
import db from '../config/database.js';
// import redis from '../config/redis.js';
import { createClient } from 'redis'; 


const router = express.Router();

// Middleware: Check authentication
function requireAuth(req, res, next) {
  if (!req.session.userId || !req.session.userDbId) {
    console.log('[Auth] No valid session found');
    return res.status(401).json({ error: 'Unauthorized - please log in again' });
  }
  
  req.user = {
    id: req.session.userDbId,        // ✅ Database ID
    google_id: req.session.userId    // ✅ Google ID
  };
  
  next();
}

// GET /api/auth/session - Check if user is authenticated
router.get('/auth/session', (req, res) => {
  if (req.session.userId) {
    res.json({ authenticated: true, userId: req.session.userId });
  } else {
    res.status(401).json({ authenticated: false });
  }
});

// POST /api/channels/track - Add channel to tracking
router.post('/channels/track', requireAuth, async (req, res) => {
  try {
    const { channelId, channelTitle, thumbnailUrl } = req.body;
    
    // ✅ FIX: Use the database user ID, not Google ID
    const userDbId = req.session.userDbId || req.user.id;
    
    if (!userDbId) {
      console.error('[POST /channels/track] No userDbId in session');
      return res.status(401).json({ error: 'User not properly authenticated' });
    }
    
    // Validate input
    if (!channelId || !channelTitle) {
      return res.status(400).json({ 
        error: 'Missing required fields: channelId and channelTitle' 
      });
    }
    
    console.log(`[POST /channels/track] User ${userDbId} adding channel ${channelId}`);
    
    // Check channel limit (5 for free tier)
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM user_channels WHERE user_id = $1',
      [userDbId]  // ✅ Use database ID
    );
    
    const channelCount = parseInt(countResult.rows[0].count);
    if (channelCount >= 5) {
      return res.status(403).json({ 
        error: 'Channel limit reached. Maximum 5 channels for free tier.' 
      });
    }
    
    // Add to user_channels
    await db.query(
      `INSERT INTO user_channels (user_id, channel_id, channel_title, thumbnail_url)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, channel_id) DO NOTHING`,
      [userDbId, channelId, channelTitle, thumbnailUrl]  // ✅ Use database ID
    );
    
    console.log(`✅ Channel ${channelId} tracked for user ${userDbId}`);
    
    // Subscribe to RSS feed
    await subscribeToChannel(channelId);
    
    res.json({ 
      success: true, 
      message: `Channel ${channelTitle} added successfully` 
    });
    
  } catch (error) {
    console.error('[POST /channels/track] Error:', error);
    res.status(500).json({ 
      error: 'Failed to track channel',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/channels/:channelId/untrack - Remove channel from tracking
router.delete('/channels/:channelId/untrack', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userDbId = req.user.id;  // ✅ Use database ID
    
    await db.query(
      'DELETE FROM user_channels WHERE user_id = $1 AND channel_id = $2',
      [userDbId, channelId]  // ✅ Use database ID
    );
    
    // Check if any other users are tracking this channel
    const otherUsers = await db.query(
      'SELECT COUNT(*) as count FROM user_channels WHERE channel_id = $1',
      [channelId]
    );
    
    if (parseInt(otherUsers.rows[0].count) === 0) {
      await unsubscribeFromChannel(channelId);
    }
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error untracking channel:', error);
    res.status(500).json({ error: 'Failed to untrack channel' });
  }
});

// GET /api/channels/tracked - Get user's tracked channels
router.get('/channels/tracked', requireAuth, async (req, res) => {
  try {
    // Use the database user ID, not the Google ID from session
    const userDbId = req.session.userDbId;
    
    if (!userDbId) {
      console.error('[API] No userDbId in session');
      return res.status(401).json({ error: 'User not properly authenticated' });
    }
    
    console.log(`[API] Fetching tracked channels for database user ID: ${userDbId}`);
    
    const result = await db.query(
      `SELECT channel_id, channel_title, thumbnail_url, added_at
       FROM user_channels
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userDbId]  // Use the database user ID, not Google ID
    );
    
    console.log(`[API] Found ${result.rows.length} channels for user ${userDbId}`);
    
    const channels = result.rows.map(row => ({
      channelId: row.channel_id,
      channelTitle: row.channel_title,
      thumbnailUrl: row.thumbnail_url
    }));
    
    res.json(channels);
    
  } catch (error) {
    console.error('Error fetching tracked channels:', error);
    res.status(500).json({ 
      error: 'Failed to fetch channels',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/channels/:channelId/live-status - Check if channel is live
router.get('/channels/:channelId/live-status', requireAuth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const liveStatus = await searchChannelForLiveStreams(channelId);

    
    // For now, return offline status since we don't have Redis cache
    // Real checks happen via RSS webhooks or fallback polling
    // const cached = await redis.get(`live:${channelId}`);
    // if (cached) {
    //   return res.json(JSON.parse(cached));
    // }
    
    // If not in cache, return offline status
    // (Real checks happen via RSS webhooks or fallback polling)
    // res.json({ isLive: false });
    res.json(liveStatus);
    
  } catch (error) {
    console.error('Error checking live status:', error);
    res.status(500).json({ error: 'Failed to check live status' });
  }
});

// GET /api/chat/:videoId/messages - Get live chat messages
router.get('/chat/:videoId/messages', requireAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // Check cache first
    // const cached = await redis.get(`chat:${videoId}`);
    // if (cached) {
    //   return res.json(JSON.parse(cached));
    // }
    
    // Fetch live chat ID
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
    );
    
    const data = await response.json();
    const video = data.items?.[0];
    
    if (!video?.liveStreamingDetails?.activeLiveChatId) {
      return res.json({ messages: [] });
    }
    
    const liveChatId = video.liveStreamingDetails.activeLiveChatId;
    
    // Fetch chat messages (costs 5 units)
    const chatResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&maxResults=100&key=${process.env.YOUTUBE_API_KEY}`
    );
    
    const chatData = await chatResponse.json();
    
    const messages = (chatData.items || []).map(item => ({
      author: item.authorDetails.displayName,
      message: item.snippet.displayMessage,
      publishedAt: item.snippet.publishedAt
    }));
    
    // Cache for 5 seconds
    await redis.setex(`chat:${videoId}`, 5, JSON.stringify({ messages }));
    
    res.json({ messages });
    
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// GET /api/notifications - Get user's notifications
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userDbId = req.user.id;  // ✅ Use database ID
    
    const result = await db.query(
      `SELECT id, channel_id, video_id, message, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userDbId]  // ✅ Use database ID
    );
    
    const notifications = result.rows.map(row => ({
      id: row.id,
      channelId: row.channel_id,
      videoId: row.video_id,
      message: row.message,
      read: row.read,
      timestamp: row.created_at
    }));
    
    const unreadCount = notifications.filter(n => !n.read).length;
    
    res.json({ notifications, unreadCount });
    
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// POST /api/notifications/mark-read - Mark all notifications as read
router.post('/notifications/mark-read', requireAuth, async (req, res) => {
  try {
    const userDbId = req.user.id;  // ✅ Use database ID
    
    await db.query(
      'UPDATE notifications SET read = TRUE WHERE user_id = $1',
      [userDbId]  // ✅ Use database ID
    );
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Simple logout endpoint that doesn't depend on user.js
router.post('/auth/simple-logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    res.clearCookie('connect.sid');
    res.json({ success: true, message: 'Logged out successfully' });
  });
});

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});
await redisClient.connect(); // Only if not already connected elsewhere

// Redis test endpoint
router.get('/test/redis', async (req, res) => {
  try {
    await redisClient.set('test-key', 'test-value', { EX: 5 });
    const value = await redisClient.get('test-key');
    res.json({ success: true, value });
  } catch (error) {
    res.status(500).json({ error: 'Redis test failed' });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'API test endpoint working!' });
});

// Database test endpoint
router.get('/test/db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ success: true, dbTime: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ error: 'Database test failed' });
  }
});

router.get('/test/db-connection', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW() as current_time, version() as version')
    res.json({ 
      success: true, 
      dbTime: result.rows[0].current_time,
      version: result.rows[0].version
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    res.status(500).json({ 
      error: 'Database connection failed',
      details: error.message 
    })
  }
})

// Add to api.js for debugging
router.get('/debug/session', (req, res) => {
  res.json({
    session: req.session,
    headers: req.headers,
    authenticated: !!req.session.userId
  });
});

router.get('/debug/users', async (req, res) => {
  try {
    const result = await db.query('SELECT id, google_id, email FROM users LIMIT 10');
    res.json({ users: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/debug/user-channels', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT uc.*, u.email 
      FROM user_channels uc 
      LEFT JOIN users u ON uc.user_id = u.id 
      LIMIT 10
    `);
    res.json({ userChannels: result.rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;