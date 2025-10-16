// fixTables.js
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;
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
  'user_tracked_channels',
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

async function normalizeChannelIds(client) {
  console.log('🔍 Checking for malformed channel IDs...');
  const tables = ['user_channels', 'live_events', 'notifications'];

  for (const table of tables) {
    const res = await client.query(`
      SELECT id, channel_id FROM ${table}
      WHERE channel_id LIKE 'http%' OR channel_id LIKE 'www.youtube%';
    `);

    if (res.rows.length === 0) {
      console.log(`✅ No malformed channel IDs found in ${table}.`);
      continue;
    }

    console.log(`⚠️ Found ${res.rows.length} malformed entries in ${table}. Fixing...`);

    for (const row of res.rows) {
      let channelId = row.channel_id;
      const match = channelId.match(/channel\/([A-Za-z0-9_-]{20,})/);

      if (match) {
        channelId = match[1];
        await client.query(
          `UPDATE ${table} SET channel_id = $1 WHERE id = $2`,
          [channelId, row.id]
        );
        console.log(`✅ Fixed ${table} row id=${row.id} → ${channelId}`);
      } else {
        console.warn(`❌ Could not extract channel ID from: ${row.channel_id}`);
      }
    }
  }
}

async function fixChannelIds() {
  const client = await pool.connect();
  try {
    console.log('🔧 Starting table verification and channel_id fix...');
    await client.query('BEGIN');

    await ensureTables(client);
    await normalizeChannelIds(client);

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
