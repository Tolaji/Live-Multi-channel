// backend/migrations/run.js - FIXED VERSION
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// ✅ Improved SSL configuration for Render
const isProduction = process.env.NODE_ENV === 'production';
const isRenderDB = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction || isRenderDB ? {
    rejectUnauthorized: false
  } : false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 2, // Smaller pool for migrations
});

async function runMigrations() {
  const client = await pool.connect();
  
  // Track what we're creating
  const createdTables = [];

  try {
    console.log('🗄️ Running database migrations...');
    console.log(`🔐 SSL: ${pool.options.ssl ? 'enabled' : 'disabled'}`);
    
    // Start transaction
    await client.query('BEGIN');
    
    // Check current state
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`📊 Found ${existingTables.rows.length} existing tables`);

    // Users table
    console.log('\n📝 Creating users table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        picture TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS api_key TEXT;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key) WHERE api_key IS NOT NULL;
    `);
    createdTables.push('users');
    console.log('✅ Created users table');

    // User channels table
    console.log('\n📝 Creating user_channels table...');
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
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_channels_user_id ON user_channels(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_channels_channel_id ON user_channels(channel_id);
    `);
    createdTables.push('user_channels');
    console.log('✅ Created user_channels table');

    // User tracked channels table (FIXED: consistent user_id type)
    console.log('\n📝 Creating user_tracked_channels table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_tracked_channels (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        channel_id VARCHAR(255) NOT NULL,
        channel_title VARCHAR(255) NOT NULL,
        thumbnail_url TEXT,
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, channel_id)
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_tracked_channels_user_id ON user_tracked_channels(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_user_tracked_channels_channel_id ON user_tracked_channels(channel_id);
    `);
    createdTables.push('user_tracked_channels');
    console.log('✅ Created user_tracked_channels table');

    // RSS subscriptions table
    console.log('\n📝 Creating rss_subscriptions table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS rss_subscriptions (
        id SERIAL PRIMARY KEY,
        channel_id VARCHAR(255) UNIQUE NOT NULL,
        topic_url TEXT NOT NULL,
        subscribed_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        last_notified_at TIMESTAMP
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_rss_subscriptions_expires_at ON rss_subscriptions(expires_at);
    `);
    createdTables.push('rss_subscriptions');
    console.log('✅ Created rss_subscriptions table');

    // Live events table
    console.log('\n📝 Creating live_events table...');
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
        checked_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_live_events_channel_id ON live_events(channel_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_live_events_video_id ON live_events(video_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_live_events_started_at ON live_events(started_at);
    `);
    await client.query(`
      ALTER TABLE live_events ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_live_events_is_active ON live_events(is_active);
    `);
    createdTables.push('live_events');
    console.log('✅ Created live_events table');

    // Notifications table
    console.log('\n📝 Creating notifications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        channel_id VARCHAR(255) NOT NULL,
        video_id VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        notification_type VARCHAR(50) DEFAULT 'live_start',
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
    `);
    createdTables.push('notifications');
    console.log('✅ Created notifications table');

    // Quota usage table
    console.log('\n📝 Creating quota_usage table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS quota_usage (
        id SERIAL PRIMARY KEY,
        endpoint VARCHAR(255) NOT NULL,
        cost INTEGER NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        timestamp TIMESTAMP DEFAULT NOW(),
        date DATE NOT NULL
      )
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quota_usage_date ON quota_usage(date);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quota_usage_user_id ON quota_usage(user_id);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quota_usage_endpoint ON quota_usage(endpoint);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_quota_usage_timestamp ON quota_usage(timestamp);
    `);
    createdTables.push('quota_usage');
    console.log('✅ Created quota_usage table');

    // User settings table
    console.log('\n📝 Creating user_settings table...');
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
      )
    `);
    createdTables.push('user_settings');
    console.log('✅ Created user_settings table');

    // Add role column to users
    console.log('\n📝 Adding role column to users...');
    await client.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
    `);
    console.log('✅ Added role column to users table');

    // Commit the transaction
    await client.query('COMMIT');
    
    // Verify the tables were created
    const finalTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('\n🎉 Migration completed successfully!');
    console.log(`📊 Created ${createdTables.length} tables:`, createdTables);
    console.log(`📊 Total tables in database: ${finalTables.rows.length}`);
    console.log('Tables:', finalTables.rows.map(r => r.table_name));

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    console.error('Error details:', {
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position
    });
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// ✅ SIMPLIFIED: Always run migrations when this file is executed
runMigrations().catch(error => {
  console.error('Fatal migration error:', error);
  process.exit(1);
});

export { runMigrations };