// backend/services/quotaService.js
import db from '../config/database.js';

class QuotaService {
  constructor() {
    this.dailyLimit = parseInt(process.env.YOUTUBE_QUOTA_LIMIT) || 10000;
    this.resetTime = '00:00';
  }

  /**
   * Track YouTube API quota usage
   */
  async trackQuotaUsage(endpoint, cost, userId = null) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const timestamp = new Date().toISOString();
      
      // For now, just log the usage since we don't have Redis cache client
      console.log(`📊 Quota tracked: ${cost} units for ${endpoint}${userId ? ` (user: ${userId})` : ''}`);
      
      // Log quota usage to DB
      await this.logQuotaUsage({
        endpoint,
        cost,
        userId,
        timestamp,
        date: today
      });
      
    } catch (error) {
      console.error('Error tracking quota usage:', error);
    }
  }

  /**
   * Get current quota usage statistics
   */
  async getQuotaUsage(userId = null) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get usage from database instead of Redis
      const result = await db.query(
        `SELECT SUM(cost) as daily_usage
         FROM quota_usage 
         WHERE date = $1`,
        [today]
      );
      
      const globalUsage = parseInt(result.rows[0]?.daily_usage) || 0;
      
      return {
        global: {
          used: globalUsage,
          limit: this.dailyLimit,
          remaining: Math.max(0, this.dailyLimit - globalUsage),
          percentUsed: Math.min(100, (globalUsage / this.dailyLimit) * 100)
        },
        user: null,
        endpoints: {},
        resetTime: this.getNextResetTime()
      };
      
    } catch (error) {
      console.error('Error getting quota usage:', error);
      return this.getDefaultQuotaStats();
    }
  }

  /**
   * Check if we have enough quota for a request
   */
  async hasSufficientQuota(cost, userId = null) {
    try {
      const usage = await this.getQuotaUsage(userId);
      
      if (usage.global.remaining < cost) {
        console.warn(`⚠️ Insufficient global quota: ${usage.global.remaining} remaining, need ${cost}`);
        return false;
      }
      
      return true;
      
    } catch (error) {
      console.error('Error checking quota:', error);
      return true;
    }
  }

  /**
   * Get YouTube API costs for different endpoints
   */
  getEndpointCost(endpoint) {
    const costMap = {
      'videos.list': 1,
      'search.list': 100,
      'liveChat.messages.list': 5,
      'channels.list': 1,
    };
    
    return costMap[endpoint] || 1;
  }

  /**
   * Log quota usage to database
   */
  async logQuotaUsage(usageData) {
    try {
      await db.query(
        `INSERT INTO quota_usage (endpoint, cost, user_id, timestamp, date)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          usageData.endpoint,
          usageData.cost,
          usageData.userId,
          usageData.timestamp,
          usageData.date
        ]
      );
    } catch (error) {
      console.error('Error logging quota usage to DB:', error);
    }
  }

  /**
   * Get historical quota usage
   */
  async getHistoricalUsage(days = 30) {
    try {
      const result = await db.query(
        `SELECT date, SUM(cost) as daily_usage
         FROM quota_usage 
         WHERE date >= CURRENT_DATE - INTERVAL '${days} days'
         GROUP BY date
         ORDER BY date DESC`
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting historical usage:', error);
      return [];
    }
  }

  /**
   * Calculate next quota reset time
   */
  getNextResetTime() {
    const reset = new Date();
    reset.setUTCHours(24, 0, 0, 0);
    return reset.toISOString();
  }

  /**
   * Default quota stats
   */
  getDefaultQuotaStats() {
    return {
      global: {
        used: 0,
        limit: this.dailyLimit,
        remaining: this.dailyLimit,
        percentUsed: 0
      },
      user: null,
      endpoints: {},
      resetTime: this.getNextResetTime()
    };
  }
}

// Create singleton instance
export const quotaService = new QuotaService();
export default quotaService;