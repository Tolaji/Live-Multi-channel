// backend/services/youtubeService.js
import axios from 'axios';

export async function checkIfVideoIsLive(videoId) {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${process.env.YOUTUBE_API_KEY}`
    );
    
    const video = response.data.items?.[0];
    const liveDetails = video?.liveStreamingDetails;
    
    return {
      isLive: !!liveDetails?.actualStartTime && !liveDetails?.actualEndTime,
      videoId,
      title: video?.snippet?.title,
      viewerCount: parseInt(liveDetails?.concurrentViewers) || 0,
      startedAt: liveDetails?.actualStartTime
    };
  } catch (error) {
    console.error('Error checking video live status:', error);
    return { isLive: false, videoId };
  }
}

export async function searchChannelForLiveStreams(channelId) {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&eventType=live&type=video&key=${process.env.YOUTUBE_API_KEY}`
    );
    
    const liveVideo = response.data.items?.[0];
    if (liveVideo) {
      return {
        isLive: true,
        videoId: liveVideo.id.videoId,
        title: liveVideo.snippet.title,
        channelId,
        publishedAt: liveVideo.snippet.publishedAt
      };
    }
    
    return { isLive: false, channelId };
  } catch (error) {
    console.error('Error searching for live streams:', error);
    return { isLive: false, channelId };
  }
}

// Add to youtubeService.js and rssFeedService.js
const retryConfig = {
  retries: 3,
  retryDelay: (retryCount) => Math.pow(2, retryCount) * 1000
};