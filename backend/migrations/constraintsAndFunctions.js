// backend/migrations/constraintsAndFunctions.js
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function addConstraintsAndFunctions() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Adding database constraints and functions...');
    
    await client.query('BEGIN');

    // Function to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    console.log('✅ Created update_updated_at_column function');

    // Trigger for users table
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
      BEFORE UPDATE ON users
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log('✅ Created update_users_updated_at trigger');

    // Function to clean up old notifications
    await client.query(`
      CREATE OR REPLACE FUNCTION cleanup_old_notifications()
      RETURNS void AS $$
      BEGIN
        DELETE FROM notifications 
        WHERE created_at < NOW() - INTERVAL '30 days'
        AND read = true;
      END;
      $$ language 'plpgsql';
    `);
    console.log('✅ Created cleanup_old_notifications function');

    // Function to get user channel stats
    await client.query(`
      CREATE OR REPLACE FUNCTION get_user_channel_stats(user_id_param INTEGER)
      RETURNS TABLE(
        total_channels BIGINT,
        live_channels BIGINT,
        total_notifications BIGINT,
        unread_notifications BIGINT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(uc.id)::BIGINT as total_channels,
          COUNT(DISTINCT le.channel_id)::BIGINT as live_channels,
          COUNT(n.id)::BIGINT as total_notifications,
          COUNT(CASE WHEN n.read = false THEN 1 END)::BIGINT as unread_notifications
        FROM user_channels uc
        LEFT JOIN live_events le ON uc.channel_id = le.channel_id AND le.is_active = true
        LEFT JOIN notifications n ON uc.user_id = n.user_id
        WHERE uc.user_id = user_id_param;
      END;
      $$ language 'plpgsql';
    `);
    console.log('✅ Created get_user_channel_stats function');

    // Function to update last_checked_at for user channels
    await client.query(`
      CREATE OR REPLACE FUNCTION update_channel_last_checked(channel_id_param VARCHAR)
      RETURNS void AS $$
      BEGIN
        UPDATE user_channels 
        SET last_checked_at = NOW() 
        WHERE channel_id = channel_id_param;
      END;
      $$ language 'plpgsql';
    `);
    console.log('✅ Created update_channel_last_checked function');

    await client.query('COMMIT');
    console.log('🎉 Database constraints and functions added successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to add constraints and functions:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Make it runnable directly
if (import.meta.url === `file://${process.argv[1]}`) {
  addConstraintsAndFunctions().catch(console.error);
}

export { addConstraintsAndFunctions };