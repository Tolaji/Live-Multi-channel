// add-test-channels.js
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});

async function addTestChannels() {
  const client = await pool.connect();
  
  try {
    console.log('📺 Adding test channels...');
    await client.query('BEGIN');

    // Get the first user
    const userResult = await client.query('SELECT id FROM users LIMIT 1');
    if (userResult.rows.length === 0) {
      throw new Error('No users found in database');
    }
    
    const userId = userResult.rows[0].id;
    console.log(`Adding channels for user ID: ${userId}`);

    // Add some popular YouTube channels for testing
    const testChannels = [
      {
        channelId: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
        channelTitle: 'Google Developers',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/APkrFKZ2M8gM_7T5WkPbqF_NYNC2KVBQ2sdGIp2ag0S7=s176-c-k-c0x00ffffff-no-rj'
      },
      {
        channelId: 'UCBJycsmduvYEL83R_U4JriQ',
        channelTitle: 'Marques Brownlee',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/APkrFKaERuzJ9n1X3pjG5a-ecRhL6a4R9kqE_Kvj5SvA=s176-c-k-c0x00ffffff-no-rj'
      },
      {
        channelId: 'UCsTcErHg8oDvUnTzoqsYeNw',
        channelTitle: 'Fireship',
        thumbnailUrl: 'https://yt3.googleusercontent.com/ytc/APkrFKb--U9V1cyXANubl_2imP93kc2d3j2o0c7q7c7-=s176-c-k-c0x00ffffff-no-rj'
      }
    ];

    for (const channel of testChannels) {
      await client.query(
        `INSERT INTO user_channels (user_id, channel_id, channel_title, thumbnail_url)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, channel_id) DO NOTHING`,
        [userId, channel.channelId, channel.channelTitle, channel.thumbnailUrl]
      );
      console.log(`✅ Added channel: ${channel.channelTitle}`);
    }

    await client.query('COMMIT');
    console.log('🎉 Test channels added successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to add test channels:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addTestChannels().catch(console.error);