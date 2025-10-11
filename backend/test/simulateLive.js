// backend/test/simulateLive.js

import { notifyUsers } from '../services/notificationService.js';

async function simulateLiveStream() {
  await notifyUsers('UC_test_channel_id', {
    videoId: 'test_video_id',
    title: 'Test Live Stream',
    thumbnailUrl: 'https://via.placeholder.com/120',
    viewerCount: 1337,
    startedAt: new Date().toISOString()
  });
  
  console.log('Simulated live stream notification sent');
}

simulateLiveStream();