import geohash from 'ngeohash';
import axios from 'axios';
import { redisClient } from '../../server.js';
import logger from '../utils/logger.js';

/**
 * Encode coordinates to geohash
 * @param {Number} lat - Latitude
 * @param {Number} lon - Longitude
 * @param {Number} precision - Geohash precision (default 7)
 * @returns {String} Geohash
 */
export function encode(lat, lon, precision = 7) {
  return geohash.encode(lat, lon, precision);
}

/**
 * Decode geohash to coordinates
 * @param {String} hash - Geohash string
 * @returns {Object} { latitude, longitude }
 */
export function decode(hash) {
  return geohash.decode(hash);
}

/**
 * Get neighboring geohashes
 * @param {String} hash - Geohash string
 * @returns {Array} Array of 8 neighboring geohashes
 */
export function neighbors(hash) {
  return geohash.neighbors(hash);
}

/**
 * Get all geohashes that cover a bounding box
 * @param {Number} lat1 - Min latitude
 * @param {Number} lon1 - Min longitude
 * @param {Number} lat2 - Max latitude
 * @param {Number} lon2 - Max longitude
 * @param {Number} precision - Geohash precision
 * @returns {Array} Array of geohashes
 */
export function getGeohashesInBbox(lat1, lon1, lat2, lon2, precision = 7) {
  const hashes = new Set();

  // Sample points across the bbox and get their geohashes
  const latStep = (lat2 - lat1) / 10;
  const lonStep = (lon2 - lon1) / 10;

  for (let lat = lat1; lat <= lat2; lat += latStep) {
    for (let lon = lon1; lon <= lon2; lon += lonStep) {
      hashes.add(encode(lat, lon, precision));
    }
  }

  return Array.from(hashes);
}

/**
 * Geocode a place name to coordinates using Nominatim
 * Uses Redis cache to avoid repeated API calls
 * @param {String} placeName - Place name to geocode
 * @returns {Object} { lat, lon, displayName } or null
 */
export async function geocode(placeName) {
  try {
    // Check cache first (if Redis is available)
    if (redisClient) {
      const cacheKey = `geo:${placeName.toLowerCase().trim()}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        logger.info('Geocode cache hit', { placeName });
        return JSON.parse(cached);
      }
    }

    // Call Nominatim API
    const response = await axios.get(
      process.env.GEOCODER_BASE_URL || 'https://nominatim.openstreetmap.org/search',
      {
        params: {
          q: placeName,
          format: 'json',
          countrycodes: 'uy', // Limit to Uruguay
          limit: 1
        },
        headers: {
          'User-Agent': 'Nexus-UY/1.0'
        }
      }
    );

    if (response.data.length === 0) {
      logger.warn('Geocoding failed - no results', { placeName });
      return null;
    }

    const result = {
      lat: parseFloat(response.data[0].lat),
      lon: parseFloat(response.data[0].lon),
      displayName: response.data[0].display_name
    };

    // Cache for 7 days (if Redis is available)
    if (redisClient) {
      await redisClient.setEx(cacheKey, 7 * 24 * 60 * 60, JSON.stringify(result));
    }

    logger.info('Geocoded successfully', { placeName, result });
    return result;
  } catch (error) {
    logger.error('Geocoding error:', { placeName, error: error.message });
    return null;
  }
}

/**
 * Reverse geocode coordinates to place name
 * @param {Number} lat - Latitude
 * @param {Number} lon - Longitude
 * @returns {String} Place name
 */
export async function reverseGeocode(lat, lon) {
  try {
    // Check cache first (if Redis is available)
    if (redisClient) {
      const cacheKey = `reverse:${lat.toFixed(4)},${lon.toFixed(4)}`;
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return cached;
      }
    }

    const response = await axios.get(
      process.env.GEOCODER_BASE_URL?.replace('/search', '/reverse') ||
        'https://nominatim.openstreetmap.org/reverse',
      {
        params: {
          lat,
          lon,
          format: 'json'
        },
        headers: {
          'User-Agent': 'Nexus-UY/1.0'
        }
      }
    );

    const placeName = response.data.display_name;

    // Cache for 7 days (if Redis is available)
    if (redisClient) {
      await redisClient.setEx(cacheKey, 7 * 24 * 60 * 60, placeName);
    }

    return placeName;
  } catch (error) {
    logger.error('Reverse geocoding error:', error);
    return null;
  }
}

/**
 * Add jitter to coordinates for privacy
 * Offsets coordinates by ~50-150m randomly
 * @param {Number} lat - Latitude
 * @param {Number} lon - Longitude
 * @returns {Object} { lat, lon }
 */
export function jitterCoordinates(lat, lon) {
  const offset = 0.001; // ~111m at equator
  const jitteredLat = lat + (Math.random() - 0.5) * offset;
  const jitteredLon = lon + (Math.random() - 0.5) * offset;

  return {
    lat: jitteredLat,
    lon: jitteredLon
  };
}
