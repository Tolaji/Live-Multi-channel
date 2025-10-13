import express from 'express'
import { requireAuth } from '../middleware/auth.js'
import db from '../config/database.js'

const router = express.Router()

// inside backend/routes/user.js
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await db.query(
      'SELECT id, email, name, picture, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    
    // Add username field (use email as fallback if username doesn't exist)
    user.username = user.name || user.email.split('@')[0];

    res.json({
      success: true,
      user: user,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// If /api/user is meant to redirect to /api/user/settings (for frontend convenience):
// router.get('/', (req, res) => {
//   res.redirect('/api/user/settings');
// });

// Get user's API key
router.get('/api-key', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    
    // Check if api_key column exists
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='api_key'
    `);
    
    if (columnCheck.rows.length === 0) {
      return res.json({ apiKey: null, message: 'API key feature not available' });
    }
    
    const result = await db.query(
      'SELECT api_key FROM users WHERE id = $1',
      [userId]
    )
    
    if (result.rows.length === 0 || !result.rows[0].api_key) {
      return res.json({ apiKey: null })
    }
    
    res.json({ apiKey: result.rows[0].api_key })
  } catch (error) {
    console.error('Error fetching API key:', error)
    res.status(500).json({ error: 'Failed to fetch API key' })
  }
})

// Store user's API key
router.post('/api-key', requireAuth, async (req, res) => {
  try {
    const { apiKey } = req.body
    const userId = req.user.id
    
    // Basic validation
    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(400).json({ error: 'Invalid API key' })
    }
    
    await db.query(
      'UPDATE users SET api_key = $1, updated_at = NOW() WHERE id = $2',
      [apiKey, userId]
    )
    
    res.json({ success: true, message: 'API key stored successfully' })
  } catch (error) {
    console.error('Error storing API key:', error)
    res.status(500).json({ error: 'Failed to store API key' })
  }
})

// Delete user's API key
router.delete('/api-key', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    
    await db.query(
      'UPDATE users SET api_key = NULL, updated_at = NOW() WHERE id = $1',
      [userId]
    )
    
    res.json({ success: true, message: 'API key deleted successfully' })
  } catch (error) {
    console.error('Error deleting API key:', error)
    res.status(500).json({ error: 'Failed to delete API key' })
  }
})

// Get user settings
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    
    const result = await db.query(
      `SELECT email_notifications, push_notifications, notification_sound, 
              theme, language 
       FROM user_settings 
       WHERE user_id = $1`,
      [userId]
    )
    
    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        email_notifications: true,
        push_notifications: true,
        notification_sound: true,
        theme: 'dark',
        language: 'en'
      })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching user settings:', error)
    res.status(500).json({ error: 'Failed to fetch user settings' })
  }
})

// Get user settings with fallback
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    
    // Check if user_settings table exists
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      // Return default settings if table doesn't exist
      return res.json({
        email_notifications: true,
        push_notifications: true,
        notification_sound: true,
        theme: 'dark',
        language: 'en'
      });
    }
    
    const result = await db.query(
      `SELECT email_notifications, push_notifications, notification_sound, 
              theme, language 
       FROM user_settings 
       WHERE user_id = $1`,
      [userId]
    )
    
    if (result.rows.length === 0) {
      // Return default settings if none exist
      return res.json({
        email_notifications: true,
        push_notifications: true,
        notification_sound: true,
        theme: 'dark',
        language: 'en'
      })
    }
    
    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching user settings:', error)
    // Return default settings on error
    res.json({
      email_notifications: true,
      push_notifications: true,
      notification_sound: true,
      theme: 'dark',
      language: 'en'
    });
  }
})

// Update user settings
router.put('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id
    const { 
      email_notifications, 
      push_notifications, 
      notification_sound, 
      theme, 
      language 
    } = req.body
    
    await db.query(
      `INSERT INTO user_settings 
       (user_id, email_notifications, push_notifications, notification_sound, theme, language, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
       email_notifications = $2, push_notifications = $3, notification_sound = $4,
       theme = $5, language = $6, updated_at = NOW()`,
      [userId, email_notifications, push_notifications, notification_sound, theme, language]
    )
    
    res.json({ success: true, message: 'Settings updated successfully' })
  } catch (error) {
    console.error('Error updating user settings:', error)
    res.status(500).json({ error: 'Failed to update user settings' })
  }
})

export default router