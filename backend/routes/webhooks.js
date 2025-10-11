// backend/routes/webhooks.js

import express from 'express';
import crypto from 'crypto';
import { parseStringPromise } from 'xml2js';
import { checkIfVideoIsLive } from '../services/youtubeService.js';
import { notifyUsers } from '../services/notificationService.js';

const router = express.Router();

// Verification endpoint (GET request from Google)
router.get('/youtube-rss', (req, res) => {
  const mode = req.query['hub.mode'];
  const topic = req.query['hub.topic'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' || mode === 'unsubscribe') {
    console.log(`Webhook verified for topic: ${topic}`);
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});

// Notification endpoint (POST request from Google)
router.post('/youtube-rss', async (req, res) => {
  // Verify signature
  const signature = req.headers['x-hub-signature'];
  if (signature) {
    const hash = crypto
      .createHmac('sha1', process.env.WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex');
    
    if (`sha1=${hash}` !== signature) {
      console.error('Invalid webhook signature');
      return res.status(403).send('Invalid signature');
    }
  }
  
  // Acknowledge receipt immediately
  res.status(200).send('OK');
  
  // Process notification asynchronously
  processRSSNotification(req.body).catch(console.error);
});

async function processRSSNotification(xmlBody) {
  try {
    const parsed = await parseStringPromise(xmlBody);
    
    // Extract video data from Atom feed
    const entry = parsed.feed?.entry?.[0];
    if (!entry) return;
    
    const videoId = entry['yt:videoId']?.[0];
    const channelId = entry['yt:channelId']?.[0];
    const title = entry.title?.[0];
    const publishedAt = entry.published?.[0];
    
    console.log(`New video detected: ${videoId} from channel ${channelId}`);
    
    // Check if video is live (costs 1 API unit)
    const liveStatus = await checkIfVideoIsLive(videoId);
    
    if (liveStatus.isLive) {
      console.log(`Video ${videoId} is LIVE!`);
      
      // Update cache
      await redis.setex(
        `live:${channelId}`,
        300, // 5 min TTL
        JSON.stringify({
          videoId,
          title,
          isLive: true,
          checkedAt: new Date().toISOString()
        })
      );
      
      // Notify users tracking this channel
      await notifyUsers(channelId, {
        videoId,
        title,
        channelId
      });
      
      // Store event in DB
      await db.query(
        `INSERT INTO live_events (channel_id, video_id, title, started_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (video_id) DO NOTHING`,
        [channelId, videoId, title]
      );
    }
    
  } catch (error) {
    console.error('Error processing RSS notification:', error);
  }
}

export default router;