import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Use the exact same config as your working server
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000,
  idleTimeoutMillis: 30000,
  max: 2,
});

async function testConnection() {
  console.log('🔌 Testing database connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Set' : '✗ Missing');
  
  const client = await pool.connect();
  try {
    // Test 1: Basic connection
    const result = await client.query('SELECT version()');
    console.log('✅ Database connection successful!');
    console.log('PostgreSQL version:', result.rows[0].version);
    
    // Test 2: Check current tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(`📊 Found ${tables.rows.length} tables in public schema`);
    tables.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // Test 3: Try to create a table
    console.log('\n🧪 Testing table creation...');
    await client.query('BEGIN');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS connection_test (
        id SERIAL PRIMARY KEY,
        test_value VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await client.query('COMMIT');
    console.log('✅ Table creation test passed!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
    console.error('Error code:', error.code);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

testConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});