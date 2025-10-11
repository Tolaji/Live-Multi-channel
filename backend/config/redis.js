import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

// Create Redis client
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  // If you set a password in Redis:
  // password: process.env.REDIS_PASSWORD,
  
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error('❌ Redis: Too many reconnection attempts');
        return new Error('Too many reconnection attempts');
      }
      // Exponential backoff: 50ms, 100ms, 200ms, etc.
      return Math.min(retries * 50, 500);
    }
  }
});

// Event handlers
redis.on('connect', () => {
  console.log('🔄 Redis connecting...');
});

redis.on('ready', () => {
  console.log('✅ Redis connected and ready');
});

redis.on('error', (err) => {
  console.error('❌ Redis error:', err);
});

redis.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Connect to Redis
(async () => {
  try {
    await redis.connect();
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    process.exit(-1);
  }
})();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Redis connection...');
  await redis.quit();
  process.exit(0);
});

export default redis;