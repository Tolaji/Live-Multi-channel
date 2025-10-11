import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('🗄️  Running database migrations...');
    
    await client.query('BEGIN');
    
    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        picture TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created users table');
    
    // User channels table
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_channels (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        channel_id VARCHAR(255) NOT NULL,
        channel_title VARCHAR(255) NOT NULL,
        thumbnail_url TEXT,
        added_at TIMESTAMP DEFAULT NOW(),
        last_checked_at TIMESTAMP,
        UNIQUE(user_id, channel_id)
      );
      
      CREATE INDEX IF NOT EXISTS idx_user_channels_user_id ON user_channels(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_channels_channel_id ON user_channels(channel_id);
    `);
    console.log('✅ Created user_channels table');
    
    // RSS subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS rss_subscriptions (
        id SERIAL PRIMARY KEY,
        channel_id VARCHAR(255) UNIQUE NOT NULL,
        topic_url TEXT NOT NULL,
        subscribed_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        last_notified_at TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_rss_subscriptions_expires_at ON rss_subscriptions(expires_at);
    `);
    console.log('✅ Created rss_subscriptions table');
    
    // Live events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS live_events (
        id SERIAL PRIMARY KEY,
        channel_id VARCHAR(255) NOT NULL,
        video_id VARCHAR(255) UNIQUE NOT NULL,
        title TEXT,
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        peak_viewers INTEGER,
        checked_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_live_events_channel_id ON live_events(channel_id);
      CREATE INDEX IF NOT EXISTS idx_live_events_video_id ON live_events(video_id);
      CREATE INDEX IF NOT EXISTS idx_live_events_started_at ON live_events(started_at);
    `);
    console.log('✅ Created live_events table');
    
    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        channel_id VARCHAR(255) NOT NULL,
        video_id VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    `);
    console.log('✅ Created notifications table');
    
    await client.query('COMMIT');
    console.log('🎉 All migrations completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);