// backend/migrations/addUserTrackedChannels.js
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables (from backend/.env)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function addUserTrackedChannelsTable() {
  const client = await pool.connect();

  try {
    console.log('🗄️ Creating user_tracked_channels table...');
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_tracked_channels (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        channel_id VARCHAR(255) NOT NULL,
        channel_title VARCHAR(255) NOT NULL,
        thumbnail_url TEXT,
        added_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, channel_id)
      );

      CREATE INDEX IF NOT EXISTS idx_user_tracked_channels_user_id 
      ON user_tracked_channels(user_id);

      CREATE INDEX IF NOT EXISTS idx_user_tracked_channels_channel_id 
      ON user_tracked_channels(channel_id);

      COMMENT ON TABLE user_tracked_channels 
      IS 'Stores user-specific channel tracking across mode switches';
    `);

    await client.query('COMMIT');
    console.log('✅ user_tracked_channels table created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  addUserTrackedChannelsTable().catch(console.error);
}

export { addUserTrackedChannelsTable };
