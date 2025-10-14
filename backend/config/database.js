import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Or use individual properties if DATABASE_URL not set:
  // host: process.env.DB_HOST || 'localhost',
  // port: process.env.DB_PORT || 5432,
  // database: process.env.DB_NAME || 'livemultichannel',
  // user: process.env.DB_USER || 'lmc_user',
  // password: process.env.DB_PASSWORD,
  
  // Connection pool settings
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return error after 2 seconds if connection fails
  maxUses: 7500 // Recycle clients after 7500 queries
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
  process.exit(-1);
});

// Helper function for queries
export async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

// Export pool as default
export default pool;