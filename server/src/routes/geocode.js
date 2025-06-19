import express from 'express';
import axios from 'axios';
import { validate, geocodeSchema } from '../utils/validation.js';
import { getOrSetCache } from '../services/supabase.js';

const router = express.Router();

// POST /geocode - Extract location from text and geocode it
router.post('/', validate(geocodeSchema), async (req, res, next) => {
  try {
    const { logger } = req;
    const { text } = req.body;

    logger.info({
      msg: 'Geocoding request received',
      module: 'geocode',
      text: text.substring(0, 100) // Log first 100 chars for privacy
    });

    // Use caching to avoid repeated API calls
    const cacheKey = `geocode:${Buffer.from(text).toString('base64')}`;
    
    const result = await getOrSetCache(cacheKey, async () => {
      return await performGeocoding(text);
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

async function performGeocoding(text) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const mapboxToken = process.env.MAPBOX_TOKEN;

  if (!geminiApiKey || !mapboxToken) {
    console.warn('⚠️  Missing API keys for geocoding. Using mock response for development.');
    console.warn('   To use real geocoding, set GEMINI_API_KEY and MAPBOX_TOKEN in your .env file');
    
    // Return mock geocoding result
    return {
      location_name: 'Mock Location (API keys not configured)',
      lat: 40.7589,
      lon: -73.9851,
      confidence: 0.5
    };
  }

  try {
    // Step 1: Use Gemini to extract location name from text
    const locationName = await extractLocationWithGemini(text, geminiApiKey);
    
    // Step 2: Use Mapbox to geocode the location name
    const coordinates = await geocodeWithMapbox(locationName, mapboxToken);
    
    return {
      location_name: locationName,
      lat: coordinates.lat,
      lon: coordinates.lon,
      confidence: coordinates.confidence || 0.8
    };
  } catch (error) {
    throw new Error(`Geocoding failed: ${error.message}`);
  }
}

async function extractLocationWithGemini(text, apiKey) {
  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [{
            text: `Extract the specific location name from this text. Return only the location name, nothing else. If no clear location is mentioned, return "Unknown location".

Text: "${text}"

Location:`
          }]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const locationName = response.data.candidates[0].content.parts[0].text.trim();
    
    // Clean up the response
    return locationName.replace(/^["']|["']$/g, ''); // Remove quotes if present
  } catch (error) {
    console.error('Gemini API error:', error.response?.data || error.message);
    throw new Error('Failed to extract location with Gemini API');
  }
}

async function geocodeWithMapbox(locationName, token) {
  try {
    const encodedLocation = encodeURIComponent(locationName);
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedLocation}.json?access_token=${token}&limit=1`
    );

    const features = response.data.features;
    
    if (!features || features.length === 0) {
      throw new Error(`No coordinates found for location: ${locationName}`);
    }

    const [lon, lat] = features[0].center;
    const confidence = features[0].relevance || 0.8;

    return { lat, lon, confidence };
  } catch (error) {
    console.error('Mapbox API error:', error.response?.data || error.message);
    throw new Error('Failed to geocode with Mapbox API');
  }
}

// GET /geocode/reverse - Reverse geocoding (coordinates to location name)
router.get('/reverse', async (req, res, next) => {
  try {
    const { logger } = req;
    const { lat, lon } = req.query;

    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const mapboxToken = process.env.MAPBOX_TOKEN;
    if (!mapboxToken) {
      console.warn('⚠️  Mapbox API key not configured. Using mock response for development.');
      
      // Return mock reverse geocoding result
      return res.json({
        location_name: 'Mock Location (API key not configured)',
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        confidence: 0.5,
        context: []
      });
    }

    logger.info({
      msg: 'Reverse geocoding request',
      module: 'geocode',
      lat: parseFloat(lat),
      lon: parseFloat(lon)
    });

    const cacheKey = `reverse_geocode:${lat}:${lon}`;
    
    const result = await getOrSetCache(cacheKey, async () => {
      return await performReverseGeocoding(lat, lon, mapboxToken);
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

async function performReverseGeocoding(lat, lon, token) {
  try {
    const response = await axios.get(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lon},${lat}.json?access_token=${token}&limit=1`
    );

    const features = response.data.features;
    
    if (!features || features.length === 0) {
      throw new Error('No location found for the given coordinates');
    }

    const feature = features[0];
    
    return {
      location_name: feature.place_name,
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      confidence: feature.relevance || 0.8,
      context: feature.context || []
    };
  } catch (error) {
    console.error('Mapbox reverse geocoding error:', error.response?.data || error.message);
    throw new Error('Failed to perform reverse geocoding');
  }
}

export default router; 