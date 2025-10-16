// backend/routes/userChannels.js
// Persist user's tracked channels across mode switches

import express from 'express';
import db from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Get user's tracked channels (persisted across modes)
router.get('/tracked', requireAuth, async (req, res) => {
  try {
    const userId = req.session.passport.user;
    
    const result = await db.query(
      `SELECT channel_id, channel_title, thumbnail_url, added_at
       FROM user_tracked_channels
       WHERE user_id = $1
       ORDER BY added_at DESC`,
      [userId]
    );
    
    const channels = result.rows.map(row => ({
      channelId: row.channel_id,
      channelTitle: row.channel_title,
      thumbnailUrl: row.thumbnail_url,
      addedAt: row.added_at
    }));
    
    res.json(channels);
  } catch (error) {
    console.error('[UserChannels] Error fetching tracked channels:', error);
    res.status(500).json({ error: 'Failed to fetch tracked channels' });
  }
});

// Add a tracked channel
router.post('/track', requireAuth, async (req, res) => {
  try {
    const userId = req.session.passport.user;
    const { channelId, channelTitle, thumbnailUrl } = req.body;
    
    if (!channelId || !channelTitle) {
      return res.status(400).json({ error: 'channelId and channelTitle are required' });
    }
    
    // Check if user already tracking this channel
    const existing = await db.query(
      `SELECT 1 FROM user_tracked_channels 
       WHERE user_id = $1 AND channel_id = $2`,
      [userId, channelId]
    );
    
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Channel already tracked' });
    }
    
    // Check user's tracked channel limit (e.g., 5 for free tier)
    const count = await db.query(
      `SELECT COUNT(*) as total FROM user_tracked_channels WHERE user_id = $1`,
      [userId]
    );
    
    const MAX_CHANNELS = 5; // Free tier limit
    if (parseInt(count.rows[0].total) >= MAX_CHANNELS) {
      return res.status(403).json({ 
        error: `Free tier limited to ${MAX_CHANNELS} channels. Remove a channel to add more.` 
      });
    }
    
    // Insert tracked channel
    await db.query(
      `INSERT INTO user_tracked_channels (user_id, channel_id, channel_title, thumbnail_url, added_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, channelId, channelTitle, thumbnailUrl || null]
    );
    
    // Subscribe to RSS feed for this channel
    const { subscribeToChannel } = await import('../services/rssFeedService.js');
    await subscribeToChannel(channelId);
    
    res.json({ 
      success: true, 
      message: 'Channel tracked successfully',
      channelId 
    });
    
  } catch (error) {
    console.error('[UserChannels] Error tracking channel:', error);
    res.status(500).json({ error: 'Failed to track channel' });
  }
});

// Remove a tracked channel
router.delete('/:channelId/untrack', requireAuth, async (req, res) => {
  try {
    const userId = req.session.passport.user;
    const { channelId } = req.params;
    
    const result = await db.query(
      `DELETE FROM user_tracked_channels 
       WHERE user_id = $1 AND channel_id = $2
       RETURNING channel_id`,
      [userId, channelId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Channel not found in tracked list' });
    }
    
    // Check if any other users are tracking this channel
    const othersTracking = await db.query(
      `SELECT COUNT(*) as count FROM user_tracked_channels WHERE channel_id = $1`,
      [channelId]
    );
    
    // If no one else is tracking, unsubscribe from RSS
    if (parseInt(othersTracking.rows[0].count) === 0) {
      const { unsubscribeFromChannel } = await import('../services/rssFeedService.js');
      await unsubscribeFromChannel(channelId);
    }
    
    res.json({ 
      success: true, 
      message: 'Channel untracked successfully' 
    });
    
  } catch (error) {
    console.error('[UserChannels] Error untracking channel:', error);
    res.status(500).json({ error: 'Failed to untrack channel' });
  }
});

export default router;