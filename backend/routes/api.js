// backend/routes/api.js - FIXED FOR JWT

import express from 'express';
import { requireAuth } from '../middleware/auth.js'; // ✅ USE GLOBAL JWT MIDDLEWARE
import { subscribeToChannel, unsubscribeFromChannel } from '../services/rssFeedService.js';
import { searchChannelForLiveStreams } from '../services/youtubeService.js';
import db from '../config/database.js';

const router = express.Router();

// GET /api/channels/resolve-video-id - Resolve Channel ID from Video ID
router.get('/channels/resolve-video-id', requireAuth, async (req, res) => {
  try {
    const { videoId } = req.query;

    if (!videoId) {
      return res.status(400).json({ error: 'Missing required field: videoId' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      console.error('YOUTUBE_API_KEY is not set');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&fields=items(snippet(channelId))&key=${apiKey}`;
    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`[API] YouTube API failed for video ${videoId}:`, errorData);
      return res.status(502).json({ error: 'Failed to retrieve video details' });
    }

    const data = await response.json();

    if (data.items?.[0]?.snippet?.channelId) {
      const channelId = data.items[0].snippet.channelId;
      console.log(`[API] Resolved video ${videoId} to Channel ID: ${channelId}`);
      return res.json({ channelId });
    }

    return res.status(404).json({ error: 'Video not found' });

  } catch (error) {
    console.error('[GET /channels/resolve-video-id] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/channels/track - Add channel to tracking
router.post('/channels/track', requireAuth, async (req, res) => {
  try {
    const { channelId, channelTitle, thumbnailUrl } = req.body;
    const userDbId = req.user.id; // ✅ JWT provides this
    
    if (!channelId || !channelTitle) {
      return res.status(400).json({ 
        error: 'Missing required fields: channelId and channelTitle' 
      });
    }
    
    console.log(`[POST /channels/track] User ${userDbId} adding channel ${channelId}`);
    
    // Check channel limit (5 for free tier)
    const countResult = await db.query(
      'SELECT COUNT(*) as count FROM user_channels WHERE user_id = $1',
      [userDbId]
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
      [userDbId, channelId, channelTitle, thumbnailUrl]
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
    const userDbId = req.user.id; // ✅ JWT provides this
    
    await db.query(
      'DELETE FROM user_channels WHERE user_id = $1 AND channel_id = $2',
      [userDbId, channelId]
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
    const userDbId = req.user.id; // ✅ JWT provides this
    
    console.log(`[API] Fetching tracked channels for user ID: ${userDbId}`);
    
    const result = await db.query(
      `SELECT channel_id, channel_title, thumbnail_url, added_at
       FROM user_channels
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userDbId]
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
    
    // Fetch chat messages
    const chatResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&maxResults=100&key=${process.env.YOUTUBE_API_KEY}`
    );
    
    const chatData = await chatResponse.json();
    
    const messages = (chatData.items || []).map(item => ({
      author: item.authorDetails.displayName,
      message: item.snippet.displayMessage,
      publishedAt: item.snippet.publishedAt
    }));
    
    res.json({ messages });
    
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

// GET /api/notifications - Get user's notifications
router.get('/notifications', requireAuth, async (req, res) => {
  try {
    const userDbId = req.user.id; // ✅ JWT provides this
    
    const result = await db.query(
      `SELECT id, channel_id, video_id, message, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userDbId]
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
    const userDbId = req.user.id; // ✅ JWT provides this
    
    await db.query(
      'UPDATE notifications SET read = TRUE WHERE user_id = $1',
      [userDbId]
    );
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error marking notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark notifications as read' });
  }
});

// Test endpoints
router.get('/test', (req, res) => {
  res.json({ success: true, message: 'API test endpoint working!' });
});

router.get('/test/db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ success: true, dbTime: result.rows[0].now });
  } catch (error) {
    res.status(500).json({ error: 'Database test failed' });
  }
});

// Debug endpoints
router.get('/debug/jwt', requireAuth, (req, res) => {
  res.json({
    authenticated: true,
    user: req.user,
    message: 'JWT authentication working!'
  });
});

export default router;