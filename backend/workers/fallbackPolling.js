// backend/workers/fallbackPolling.js

import cron from 'node-cron';
import { searchChannelForLiveStreams } from '../services/youtubeService.js';
import redis from '../config/redis.js';
import db from '../config/database.js';

// Run every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  console.log('[Fallback Polling] Starting...');
  
  try {
    // Get all channels that haven't been checked via RSS in last 30 min
    const staleChannels = await db.query(`
      SELECT DISTINCT channel_id 
      FROM user_channels 
      WHERE channel_id NOT IN (
        SELECT channel_id 
        FROM live_events 
        WHERE checked_at > NOW() - INTERVAL '30 minutes'
      )
      LIMIT 50
    `);
    
    for (const row of staleChannels.rows) {
      const { channel_id } = row;
      
      // Check cache first
      const cached = await redis.get(`live:${channel_id}`);
      if (cached) {
        const data = JSON.parse(cached);
        if (Date.now() - new Date(data.checkedAt).getTime() < 600000) {
          // Cache is less than 10 min old, skip
          continue;
        }
      }
      
      // Check live status (costs 100 units)
      const liveStatus = await searchChannelForLiveStreams(channel_id);
      
      if (liveStatus.isLive) {
        console.log(`[Fallback] Found live stream: ${channel_id}`);
        
        // Update cache
        await redis.setex(
          `live:${channel_id}`,
          300,
          JSON.stringify({
            ...liveStatus,
            checkedAt: new Date().toISOString()
          })
        );
        
        // Notify users
        await notifyUsers(channel_id, liveStatus);
      }
      
      // Record check in DB
      await db.query(
        `UPDATE user_channels 
         SET last_checked_at = NOW() 
         WHERE channel_id = $1`,
        [channel_id]
      );
      
      // Rate limit: 1 call per 2 seconds = 1800 calls/hour = 43,200 calls/day
      // At 100 units/call = 4.32M units/day (need to buy quota)
      // For portfolio project: limit to 10 channels = 14,400 units/day (need quota increase)
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('[Fallback Polling] Complete');
    
  } catch (error) {
    console.error('[Fallback Polling] Error:', error);
  }
});