// backend/services/rssFeedService.js

import db from '../config/database.js';
import axios from 'axios';
import crypto from 'crypto';

const HUB_URL = 'https://pubsubhubbub.appspot.com/subscribe';
const CALLBACK_URL = process.env.BASE_URL + '/webhooks/youtube-rss';

export async function subscribeToChannel(channelId) {
  const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;
  
  try {
    const response = await axios.post(
      HUB_URL,
      new URLSearchParams({
        'hub.callback': CALLBACK_URL,
        'hub.topic': topicUrl,
        'hub.verify': 'async',
        'hub.mode': 'subscribe',
        'hub.lease_seconds': '864000', // 10 days
        'hub.secret': process.env.WEBHOOK_SECRET
      }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      }
    );
    
    console.log(`Subscribed to ${channelId}:`, response.status);
    
    // Store subscription in DB
    await db.query(
      `INSERT INTO rss_subscriptions (channel_id, topic_url, subscribed_at, expires_at)
       VALUES ($1, $2, NOW(), NOW() + INTERVAL '10 days')
       ON CONFLICT (channel_id) DO UPDATE
       SET subscribed_at = NOW(), expires_at = NOW() + INTERVAL '10 days'`,
      [channelId, topicUrl]
    );
    
    return { success: true };
    
  } catch (error) {
    console.error(`Failed to subscribe to ${channelId}:`, error);
    return { success: false, error: error.message };
  }
}

export async function unsubscribeFromChannel(channelId) {
  const topicUrl = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;
  
  await axios.post(
    HUB_URL,
    new URLSearchParams({
      'hub.callback': CALLBACK_URL,
      'hub.topic': topicUrl,
      'hub.verify': 'async',
      'hub.mode': 'unsubscribe'
    })
  );
  
  await db.query('DELETE FROM rss_subscriptions WHERE channel_id = $1', [channelId]);
}

// Add to youtubeService.js and rssFeedService.js
const retryConfig = {
  retries: 3,
  retryDelay: (retryCount) => Math.pow(2, retryCount) * 1000
};