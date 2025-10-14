// backend/migrations/constraintsAndFunctions.js
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runConstraintsAndFunctions() {
  const client = await pool.connect();

  try {
    console.log('🔧 Adding database constraints and functions...');

    // ✅ Ensure is_active column exists before creating functions
    await client.query(`
      ALTER TABLE live_events
      ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT FALSE;
    `);
    console.log('✅ Ensured live_events.is_active column exists');

    // 🔹 1. Trigger function to update updated_at
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created update_updated_at_column function');

    // 🔹 2. Trigger on users table
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Created update_users_updated_at trigger');

    // 🔹 3. Cleanup old notifications (example: older than 30 days)
    await client.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_notifications()
      RETURNS VOID AS $$
      BEGIN
        DELETE FROM notifications
        WHERE created_at < NOW() - INTERVAL '30 days';
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created cleanup_old_notifications function');

    // 🔹 4. Get user channel stats (fixed version)
    await client.query(`
      CREATE OR REPLACE FUNCTION get_user_channel_stats(user_id_param INT)
      RETURNS TABLE (
        total_channels BIGINT,
        live_channels BIGINT,
        total_notifications BIGINT,
        unread_notifications BIGINT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          COUNT(uc.id)::BIGINT AS total_channels,
          COUNT(DISTINCT le.channel_id)::BIGINT AS live_channels,
          COUNT(n.id)::BIGINT AS total_notifications,
          COUNT(CASE WHEN n.read = false THEN 1 END)::BIGINT AS unread_notifications
        FROM user_channels uc
        LEFT JOIN live_events le
          ON uc.channel_id = le.channel_id AND le.is_active = TRUE
        LEFT JOIN notifications n
          ON uc.user_id = n.user_id
        WHERE uc.user_id = user_id_param;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created get_user_channel_stats function');

    // 🔹 5. Update channel last_checked
    await client.query(`
      CREATE OR REPLACE FUNCTION update_channel_last_checked()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.last_checked = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Created update_channel_last_checked function');

    console.log('🎉 Database constraints and functions added successfully!');
  } catch (error) {
    console.error('❌ Error adding constraints/functions:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runConstraintsAndFunctions();
