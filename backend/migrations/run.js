import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add connection timeout and keep it open for multiple operations
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
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
      ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key TEXT;
      CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key) WHERE api_key IS NOT NULL;
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
        description TEXT,
        thumbnail_url TEXT,
        started_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP,
        peak_viewers INTEGER,
        average_viewers INTEGER,
        checked_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT TRUE
      );
      
      CREATE INDEX IF NOT EXISTS idx_live_events_channel_id ON live_events(channel_id);
      CREATE INDEX IF NOT EXISTS idx_live_events_video_id ON live_events(video_id);
      CREATE INDEX IF NOT EXISTS idx_live_events_started_at ON live_events(started_at);
      CREATE INDEX IF NOT EXISTS idx_live_events_is_active ON live_events(is_active);
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
        notification_type VARCHAR(50) DEFAULT 'live_start', -- live_start, live_end, highlight, etc.
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
      
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
    `);
    console.log('✅ Created notifications table');

    // Quota usage table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quota_usage (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        cost INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        date DATE NOT NULL
      );
      
      CREATE INDEX IF NOT EXISTS idx_quota_usage_date ON quota_usage(date);
      CREATE INDEX IF NOT EXISTS idx_quota_usage_user_id ON quota_usage(user_id);
      CREATE INDEX IF NOT EXISTS idx_quota_usage_endpoint ON quota_usage(endpoint);
      CREATE INDEX IF NOT EXISTS idx_quota_usage_timestamp ON quota_usage(timestamp);
    `);
    console.log('✅ Created quota_usage table');
    
    // User settings table (optional but useful)
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        email_notifications BOOLEAN DEFAULT TRUE,
        push_notifications BOOLEAN DEFAULT TRUE,
        notification_sound BOOLEAN DEFAULT TRUE,
        theme VARCHAR(20) DEFAULT 'light',
        language VARCHAR(10) DEFAULT 'en',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Created user_settings table');

    // Add role column to users table for admin functionality
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'
    `);
    console.log('✅ Added role column to users table');

    // Add default admin user if specified in env (optional)
    if (process.env.DEFAULT_ADMIN_EMAIL) {
      await client.query(`
        INSERT INTO users (google_id, email, name, role) 
        VALUES ('admin_default', $1, 'System Admin', 'admin')
        ON CONFLICT (google_id) DO UPDATE SET role = 'admin'
      `, [process.env.DEFAULT_ADMIN_EMAIL]);
      console.log('✅ Created default admin user');
    }

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

// Add function to check if migrations are needed
async function checkMigrations() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    return result.rows[0].exists;
  } catch (error) {
    console.error('Error checking migrations:', error);
    return false;
  } finally {
    client.release();
  }
}



// Make it runnable directly or importable
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations().catch(console.error);
}

export { runMigrations, checkMigrations };