// fixTables.js
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });


const { Pool } = pg;

// Debug logs
console.log('env DATABASE_URL =', process.env.DATABASE_URL);
console.log('env DB_PASSWORD =', process.env.DB_PASSWORD);
console.log('typeof DATABASE_URL =', typeof process.env.DATABASE_URL);
console.log('typeof DB_PASSWORD =', typeof process.env.DB_PASSWORD);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const expectedTables = [
  'users',
  'user_channels',
  'user_tracked_channels', // ✅ corrected spelling
  'rss_subscriptions',
  'live_events',
  'notifications',
  'quota_usage',
  'user_settings'
];

async function ensureTables(client) {
  console.log('🧩 Ensuring all expected tables exist...');

  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public';
  `);

  const existing = res.rows.map(r => r.table_name);
  const missing = expectedTables.filter(t => !existing.includes(t));

  if (missing.length === 0) {
    console.log('✅ All expected tables already exist.');
    return;
  }

  console.log('⚠️ Missing tables:', missing);

  for (const table of missing) {
    switch (table) {
      case 'user_tracked_channels':
        await client.query(`
          CREATE TABLE user_tracked_channels (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            channel_id VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('🆕 Created user_tracked_channels');
        break;

      case 'quota_usage':
        await client.query(`
          CREATE TABLE quota_usage (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            used_quota INTEGER DEFAULT 0,
            quota_limit INTEGER DEFAULT 1000,
            period_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            period_end TIMESTAMP DEFAULT CURRENT_TIMESTAMP + INTERVAL '30 days'
          );
        `);
        console.log('🆕 Created quota_usage');
        break;

      case 'user_settings':
        await client.query(`
          CREATE TABLE user_settings (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            theme_preference VARCHAR(50) DEFAULT 'light',
            notification_preferences JSONB DEFAULT '{}'::jsonb,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        console.log('🆕 Created user_settings');
        break;

      default:
        console.log(`ℹ️ Skipping unknown table: ${table}`);
    }
  }
}

async function fixChannelIds() {
  const client = await pool.connect();
  try {
    console.log('🔧 Starting channel_id fix and table verification...');
    await client.query('BEGIN');

    // 1️⃣ Ensure all expected tables exist
    await ensureTables(client);

    // 2️⃣ Fix channel_id column data types
    const tablesWithChannelId = ['user_channels', 'live_events', 'notifications'];
    for (const table of tablesWithChannelId) {
      await client.query(`
        ALTER TABLE ${table}
        ALTER COLUMN channel_id TYPE VARCHAR(255);
      `);
      console.log(`✅ Fixed ${table}.channel_id`);
    }

    await client.query('COMMIT');
    console.log('🎉 Migration repairs and fixes completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to repair tables or fix channel IDs:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixChannelIds().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
