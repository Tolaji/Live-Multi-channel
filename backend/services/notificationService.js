// backend/services/notificationService.js

import socketService from './socketService.js';
import db from '../config/database.js';

export async function notifyUsers(channelId, liveData) {
  try {
    // Get all users tracking this channel
    const result = await db.query(
      `SELECT DISTINCT user_id 
       FROM user_channels 
       WHERE channel_id = $1`,
      [channelId]
    );
    
    const userIds = result.rows.map(row => row.user_id);
    
    if (userIds.length === 0) return;
    
    console.log(`Notifying ${userIds.length} users about ${channelId} going live`);
    
    // Emit to all users in their rooms using socketService
    socketService.notifyUsers(userIds, 'channel:live', {
      channelId,
      videoId: liveData.videoId,
      title: liveData.title,
      thumbnailUrl: liveData.thumbnailUrl,
      viewerCount: liveData.viewerCount || 0,
      startedAt: liveData.startedAt || new Date().toISOString()
    });
    
    // Store notification in DB for persistence
    const notificationPromises = userIds.map(userId =>
      db.query(
        `INSERT INTO notifications (user_id, channel_id, video_id, message, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [
          userId,
          channelId,
          liveData.videoId,
          `${liveData.title} is now live!`
        ]
      )
    );
    
    await Promise.all(notificationPromises);
    
  } catch (error) {
    console.error('Error notifying users:', error);
  }
}

export async function notifyChannelOffline(channelId) {
  try {
    const result = await db.query(
      `SELECT DISTINCT user_id 
       FROM user_channels 
       WHERE channel_id = $1`,
      [channelId]
    );
    
    const userIds = result.rows.map(row => row.user_id);
    
    socketService.notifyUsers(userIds, 'channel:offline', { channelId });
    
  } catch (error) {
    console.error('Error notifying channel offline:', error);
  }
}