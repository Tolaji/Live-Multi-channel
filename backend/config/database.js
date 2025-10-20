// backend/database.js - FIXED VERSION
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const isProduction = process.env.NODE_ENV === 'production';
const isRenderDB = process.env.DATABASE_URL?.includes('render.com');
const needsSSL = isProduction || isRenderDB;

console.log('🗄️  Database Configuration:');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   SSL Required: ${needsSSL ? 'YES' : 'NO'}`);
console.log(`   Database URL: ${process.env.DATABASE_URL ? '✅ SET' : '❌ NOT SET'}`);


// Create connection pool with conditional SSL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // ✅ Conditional SSL - only in production
  ssl: needsSSL ? {
    rejectUnauthorized: false
  } : false,
  
  // Connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500
});

// Connection event handlers for better debugging
pool.on('connect', (client) => {
  console.log('✅ Database connected');
  
  // Log connection details (without sensitive info)
  const connectionInfo = {
    database: client.database,
    host: client.host,
    port: client.port,
    ssl: !!client.ssl
  };
  console.log('   Connection details:', JSON.stringify(connectionInfo, null, 2));
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err.message);
  
  // Provide helpful debugging info
  if (err.code === 'ENOTFOUND') {
    console.error('💡 DNS resolution failed - check if DATABASE_URL uses external hostname');
    console.error('   Expected format: postgresql://user:pass@HOST.frankfurt-postgres.render.com/db');
  } else if (err.code === 'ECONNREFUSED') {
    console.error('💡 Connection refused - check if database is running and accessible');
  } else if (err.message?.includes('SSL')) {
    console.error('💡 SSL error - ensure SSL is properly configured for external connections');
  }
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Initial database test query failed:', err.message);
  } else {
    console.log('✅ Database test successful. Server time:', res.rows[0].now);
  }
});

// Helper function for queries
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Query executed', { 
        text: text.substring(0, 50) + '...', 
        duration: `${duration}ms`, 
        rows: res.rowCount 
      });
    }
    
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error.message);
    console.error('   Query:', text.substring(0, 100));
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down database connection pool...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, closing database connections...');
  await pool.end();
  console.log('✅ Database connections closed');
  process.exit(0);
});

// Export pool as default
export default pool;