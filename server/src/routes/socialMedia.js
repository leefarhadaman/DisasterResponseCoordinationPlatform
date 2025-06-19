import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getOrSetCache } from '../services/supabase.js';

const router = express.Router();

// GET /social-media/mock - Mock social media feed
router.get('/mock', async (req, res, next) => {
  try {
    const { logger } = req;
    const { disaster_id, platform = 'twitter' } = req.query;

    logger.info({
      msg: 'Mock social media feed requested',
      module: 'socialMedia',
      disasterId: disaster_id,
      platform
    });

    // Generate mock social media posts
    const mockPosts = generateMockSocialMediaPosts(disaster_id, platform);

    res.json(mockPosts);
  } catch (error) {
    next(error);
  }
});

// GET /social-media/twitter - Real Twitter API integration (if available)
router.get('/twitter', async (req, res, next) => {
  try {
    const { logger } = req;
    const { disaster_id, query } = req.query;
    const twitterBearer = process.env.TWITTER_BEARER;

    if (!twitterBearer) {
      // Fall back to mock data if no Twitter API key
      logger.warn({
        msg: 'Twitter API key not configured, using mock data',
        module: 'socialMedia'
      });
      
      const mockPosts = generateMockSocialMediaPosts(disaster_id, 'twitter');
      return res.json(mockPosts);
    }

    logger.info({
      msg: 'Twitter API request',
      module: 'socialMedia',
      disasterId: disaster_id,
      query
    });

    const cacheKey = `twitter:${disaster_id}:${query}`;
    
    const posts = await getOrSetCache(cacheKey, async () => {
      return await fetchTwitterPosts(query || 'disaster emergency');
    });

    res.json(posts);
  } catch (error) {
    next(error);
  }
});

// GET /social-media/official-updates - Scrape official government/NGO updates
router.get('/official-updates', async (req, res, next) => {
  try {
    const { logger } = req;
    const { disaster_id, source } = req.query;

    logger.info({
      msg: 'Official updates requested',
      module: 'socialMedia',
      disasterId: disaster_id,
      source
    });

    const cacheKey = `official_updates:${disaster_id}:${source}`;
    
    const updates = await getOrSetCache(cacheKey, async () => {
      return await scrapeOfficialUpdates(source);
    });

    res.json(updates);
  } catch (error) {
    next(error);
  }
});

// POST /social-media/verify-post - Verify a social media post
router.post('/verify-post', async (req, res, next) => {
  try {
    const { logger } = req;
    const { post_id, platform, content, image_url } = req.body;

    logger.info({
      msg: 'Post verification requested',
      module: 'socialMedia',
      postId: post_id,
      platform
    });

    // This would integrate with fact-checking APIs or AI verification
    const verificationResult = await verifySocialMediaPost(content, image_url);

    res.json({
      post_id,
      platform,
      verified: verificationResult.verified,
      confidence: verificationResult.confidence,
      analysis: verificationResult.analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// Helper functions
function generateMockSocialMediaPosts(disasterId, platform) {
  const mockPosts = [
    {
      id: `post_${Date.now()}_1`,
      platform,
      content: 'Heavy flooding reported in the downtown area. Emergency services are responding.',
      author: '@local_reporter',
      author_verified: true,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      engagement: {
        likes: 45,
        retweets: 12,
        replies: 8
      },
      location: 'Downtown Area',
      verified: true
    },
    {
      id: `post_${Date.now()}_2`,
      platform,
      content: 'Just saw emergency vehicles heading towards the affected area. Stay safe everyone!',
      author: '@concerned_citizen',
      author_verified: false,
      timestamp: new Date(Date.now() - 600000).toISOString(),
      engagement: {
        likes: 23,
        retweets: 5,
        replies: 3
      },
      location: 'Near Main Street',
      verified: false
    },
    {
      id: `post_${Date.now()}_3`,
      platform,
      content: 'Official evacuation order issued for residents in flood-prone areas. Please follow instructions.',
      author: '@city_emergency',
      author_verified: true,
      timestamp: new Date(Date.now() - 900000).toISOString(),
      engagement: {
        likes: 156,
        retweets: 89,
        replies: 23
      },
      location: 'City Hall',
      verified: true
    }
  ];

  return mockPosts;
}

async function fetchTwitterPosts(query) {
  const twitterBearer = process.env.TWITTER_BEARER;
  
  try {
    const response = await axios.get(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=10`,
      {
        headers: {
          'Authorization': `Bearer ${twitterBearer}`
        }
      }
    );

    return response.data.data.map(tweet => ({
      id: tweet.id,
      platform: 'twitter',
      content: tweet.text,
      author: `@user_${tweet.id}`,
      author_verified: false,
      timestamp: tweet.created_at,
      engagement: {
        likes: Math.floor(Math.random() * 100),
        retweets: Math.floor(Math.random() * 50),
        replies: Math.floor(Math.random() * 20)
      },
      verified: false
    }));
  } catch (error) {
    console.error('Twitter API error:', error.response?.data || error.message);
    // Fall back to mock data
    return generateMockSocialMediaPosts(null, 'twitter');
  }
}

async function scrapeOfficialUpdates(source) {
  // Mock official sources for demonstration
  const officialSources = {
    'fema': 'https://www.fema.gov/news-disasters',
    'redcross': 'https://www.redcross.org/about-us/news-and-events/news.html',
    'weather': 'https://www.weather.gov/news'
  };

  const sourceUrl = officialSources[source] || officialSources.fema;

  try {
    const response = await axios.get(sourceUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; DisasterCoordinationBot/1.0)'
      }
    });

    const $ = cheerio.load(response.data);
    
    // This is a simplified scraper - in production, you'd need more sophisticated parsing
    const updates = [];
    
    // Example scraping logic (would need to be customized per source)
    $('article, .news-item, .update').each((i, element) => {
      const title = $(element).find('h1, h2, h3, .title').first().text().trim();
      const content = $(element).find('p, .content, .description').first().text().trim();
      const timestamp = $(element).find('time, .date').first().text().trim();
      
      if (title && content) {
        updates.push({
          id: `update_${Date.now()}_${i}`,
          source: source || 'official',
          title,
          content: content.substring(0, 500), // Limit content length
          timestamp: timestamp || new Date().toISOString(),
          priority: 'medium',
          url: sourceUrl
        });
      }
    });

    // If no updates found, return mock data
    if (updates.length === 0) {
      return generateMockOfficialUpdates(source);
    }

    return updates.slice(0, 10); // Limit to 10 updates
  } catch (error) {
    console.error('Web scraping error:', error.message);
    // Fall back to mock data
    return generateMockOfficialUpdates(source);
  }
}

function generateMockOfficialUpdates(source) {
  return [
    {
      id: `update_${Date.now()}_1`,
      source: source || 'City Emergency Management',
      title: 'Evacuation Order Issued',
      content: 'Residents in affected areas are ordered to evacuate immediately. Emergency shelters are open at the following locations...',
      timestamp: new Date().toISOString(),
      priority: 'high',
      url: '#'
    },
    {
      id: `update_${Date.now()}_2`,
      source: source || 'National Weather Service',
      title: 'Severe Weather Warning Extended',
      content: 'The severe weather warning has been extended for the next 6 hours. Heavy rainfall and flooding expected.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      priority: 'high',
      url: '#'
    },
    {
      id: `update_${Date.now()}_3`,
      source: source || 'Red Cross',
      title: 'Emergency Response Team Deployed',
      content: 'Red Cross emergency response teams have been deployed to provide assistance to affected communities.',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      priority: 'medium',
      url: '#'
    }
  ];
}

async function verifySocialMediaPost(content, imageUrl) {
  // This would integrate with fact-checking APIs or AI verification
  // For now, return a mock verification result
  
  const hasKeywords = content.toLowerCase().includes('emergency') || 
                     content.toLowerCase().includes('disaster') ||
                     content.toLowerCase().includes('flood') ||
                     content.toLowerCase().includes('fire');
  
  const hasImage = !!imageUrl;
  
  // Simple heuristic: posts with emergency keywords and images are more likely to be verified
  const confidence = hasKeywords ? (hasImage ? 0.8 : 0.6) : 0.3;
  
  return {
    verified: confidence > 0.5,
    confidence,
    analysis: `Post contains ${hasKeywords ? 'emergency-related keywords' : 'no emergency keywords'}${hasImage ? ' and includes an image' : ''}. Confidence score: ${confidence}`
  };
}

export default router; 