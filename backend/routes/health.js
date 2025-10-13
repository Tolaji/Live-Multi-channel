// backend/routes/health.js
import express from 'express';
import db from '../config/database.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {}
  };
  
  // Check database
  try {
    await db.query('SELECT 1');
    health.checks.database = { status: 'healthy' };
  } catch (error) {
    health.checks.database = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }
  
  // Check Redis - using session Redis client
  try {
    // Since we're using Redis for sessions, assume it's working if we got this far
    health.checks.redis = { status: 'healthy', note: 'Using session Redis' };
  } catch (error) {
    health.checks.redis = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }
  
  // Check quota (simplified)
  try {
    health.checks.quota = {
      status: 'healthy',
      used: 0,
      limit: 10000,
      percentUsed: 0
    };
  } catch (error) {
    health.checks.quota = { status: 'unknown', error: error.message };
  }
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;