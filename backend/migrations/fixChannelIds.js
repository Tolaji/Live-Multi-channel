// fixChannelIds.js
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const { Pool } = pg;

// Debug logs
console.log('env DATABASE_URL =', process.env.DATABASE_URL);
console.log('env DB_PASSWORD =', process.env.DB_PASSWORD);
console.log('typeof DATABASE_URL =', typeof process.env.DATABASE_URL);
console.log('typeof DB_PASSWORD =', typeof process.env.DB_PASSWORD);

const pool = new Pool({
  // Use explicit config rather than only connectionString (for clarity)
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // fallback to connectionString if you prefer
  // connectionString: process.env.DATABASE_URL
});

async function fixChannelIds() {
  const client = await pool.connect();
  try {
    console.log('🔧 Fixing channel_id data types...');
    await client.query('BEGIN');

    await client.query(`
      ALTER TABLE user_channels 
      ALTER COLUMN channel_id TYPE VARCHAR(255)
    `);
    console.log('✅ Fixed user_channels.channel_id');

    await client.query(`
      ALTER TABLE live_events 
      ALTER COLUMN channel_id TYPE VARCHAR(255)
    `);
    console.log('✅ Fixed live_events.channel_id');

    await client.query(`
      ALTER TABLE notifications 
      ALTER COLUMN channel_id TYPE VARCHAR(255)
    `);
    console.log('✅ Fixed notifications.channel_id');

    await client.query('COMMIT');
    console.log('🎉 Channel ID fixes completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to fix channel IDs:', error);
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
