import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
});

async function debugMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Debugging migration...');
    await client.query('BEGIN');

    // Test 1: Check current tables
    console.log('\n📊 Checking current tables...');
    const tablesBefore = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables before migration:', tablesBefore.rows.map(r => r.table_name));

    // Test 2: Try to create a simple table
    console.log('\n🧪 Creating test table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS migration_test (
        id SERIAL PRIMARY KEY,
        test_value VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Test table creation attempted');

    // Test 3: Check if test table was created
    const tablesAfter = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Tables after test:', tablesAfter.rows.map(r => r.table_name));

    // Test 4: Try to create users table explicitly
    console.log('\n🧪 Creating users table explicitly...');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        google_id VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        picture TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Users table creation attempted');

    await client.query('COMMIT');
    console.log('\n🎉 Debug migration completed');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Debug migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

debugMigration().catch(console.error);