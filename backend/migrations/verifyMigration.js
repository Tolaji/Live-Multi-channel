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
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runVerification() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verifying database changes...');

    // 1️⃣ Column type check
    const colCheck = await client.query(`
      SELECT table_name, column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'channel_id'
        AND table_name IN ('user_channels', 'live_events', 'notifications')
      ORDER BY table_name;
    `);
    console.log('\nColumn type check (channel_id):');
    console.table(colCheck.rows);

    // 2️⃣ Trigger check
    const triggerCheck = await client.query(`
      SELECT tgname AS trigger_name,
             pg_get_triggerdef(oid) AS trigger_definition
      FROM pg_trigger
      WHERE tgrelid = 'users'::regclass;
    `);
    console.log('\nTriggers on users table:');
    console.table(triggerCheck.rows);

    // 3️⃣ Function check
    const funcNames = [
      'update_updated_at_column',
      'cleanup_old_notifications',
      'get_user_channel_stats',
      'update_channel_last_checked'
    ];
    const funcCheck = await client.query(`
      SELECT proname AS function_name
      FROM pg_proc
      WHERE proname = ANY($1)
      ORDER BY proname;
    `, [funcNames]);
    console.log('\nUser-defined functions found:');
    console.table(funcCheck.rows);

    // 4️⃣ Execute test function
    const sampleUserId = 1;
    console.log(`\nExecuting get_user_channel_stats(${sampleUserId})...`);
    const statsResult = await client.query(`
      SELECT * FROM get_user_channel_stats($1);
    `, [sampleUserId]);
    console.log('Result:');
    console.table(statsResult.rows);

    console.log('\n✅ Extended verification complete.');
  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

runVerification();
