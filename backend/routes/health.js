// backend/routes/health.js

import express from 'express';
import redis from '../config/redis.js';
import db from '../config/database.js';

const router = express.Router();

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
  
  // Check Redis
  try {
    await redis.ping();
    health.checks.redis = { status: 'healthy' };
  } catch (error) {
    health.checks.redis = { status: 'unhealthy', error: error.message };
    health.status = 'degraded';
  }
  
  // Check quota
  try {
    const quotaUsage = await getQuotaUsage();
    health.checks.quota = {
      status: quotaUsage.percentUsed > 90 ? 'warning' : 'healthy',
      used: quotaUsage.used,
      limit: quotaUsage.limit,
      percentUsed: quotaUsage.percentUsed
    };
  } catch (error) {
    health.checks.quota = { status: 'unknown', error: error.message };
  }
  
  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

export default router;