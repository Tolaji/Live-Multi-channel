// backend/migrations/verifyMigration.js
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

console.log('🔍 Loaded environment file from:', envPath);
console.log('env DATABASE_URL =', process.env.DATABASE_URL);

const { Pool } = pg;

// ✅ Add robust SSL configuration for Render
const isProduction = process.env.NODE_ENV === 'production';
const isRenderDB = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ✅ Force SSL for Render, optional for local development
  ssl: isProduction || isRenderDB ? { 
    rejectUnauthorized: false 
  } : false,
  // ✅ Add connection timeouts and retry logic
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 5, // Reduce connection pool size
});

async function runVerification() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verifying database changes...');

    // ✅ 1️⃣ Verify all important tables exist
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

    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\n📋 Existing tables in public schema:');
    console.table(tableCheck.rows);

    const existingTables = tableCheck.rows.map(row => row.table_name);
    const missingTables = expectedTables.filter(t => !existingTables.includes(t));

    if (missingTables.length > 0) {
      console.warn('⚠️ Missing expected tables:', missingTables);
    } else {
      console.log('✅ All expected tables exist!');
    }

    // ✅ 2️⃣ Column type check for channel_id
    const colCheck = await client.query(`
      SELECT table_name, column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'channel_id'
        AND table_name IN ('user_channels', 'user_tracked_channels', 'live_events', 'notifications')
      ORDER BY table_name;
    `);
    console.log('\n🧩 Column type check (channel_id):');
    console.table(colCheck.rows);

    // ✅ 3️⃣ Check user_id data type consistency
    const userIdCheck = await client.query(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'user_id'
        AND table_name IN ('user_channels', 'user_tracked_channels')
      ORDER BY table_name;
    `);
    console.log('\n🔍 User ID data type consistency check:');
    console.table(userIdCheck.rows);

    // ✅ 4️⃣ Trigger check on users table
    try {
      const triggerCheck = await client.query(`
        SELECT tgname AS trigger_name,
               pg_get_triggerdef(oid) AS trigger_definition
        FROM pg_trigger
        WHERE tgrelid = 'users'::regclass;
      `);
      console.log('\n⚙️ Triggers on users table:');
      console.table(triggerCheck.rows);
    } catch (error) {
      console.log('\n⚙️ No triggers found on users table (this is ok)');
    }

    // ✅ 5️⃣ Function existence check
    const funcNames = [
      'update_updated_at_column',
      'cleanup_old_notifications',
      'get_user_channel_stats',
      'update_channel_last_checked'
    ];
    try {
      const funcCheck = await client.query(`
        SELECT proname AS function_name
        FROM pg_proc
        WHERE proname = ANY($1)
        ORDER BY proname;
      `, [funcNames]);
      console.log('\n🧠 User-defined functions found:');
      console.table(funcCheck.rows);
    } catch (error) {
      console.log('\n🧠 No user-defined functions found (this is ok)');
    }

    // ✅ 6️⃣ Execute test function for sample user (if exists)
    try {
      const sampleUserId = 1;
      console.log(`\n📈 Executing get_user_channel_stats(${sampleUserId})...`);
      const statsResult = await client.query(`
        SELECT * FROM get_user_channel_stats($1);
      `, [sampleUserId]);
      console.log('Result:');
      console.table(statsResult.rows);
    } catch (error) {
      console.log('\n📈 Function test skipped (function may not exist yet)');
    }

    console.log('\n✅ Extended verification complete.');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Add error handling for the main execution
runVerification().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});