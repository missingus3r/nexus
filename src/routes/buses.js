import express from 'express';
import axios from 'axios';
import tokenManager from '../services/montevideoTokenManager.js';

const router = express.Router();

// Cache para reducir llamadas a la API
const cache = {
  busstops: { data: null, timestamp: 0 },
  buses: { data: null, timestamp: 0 }
};

// Configuración de cache desde env
const BUS_CACHE_DURATION = parseInt(process.env.BUS_CACHE_DURATION || '3000');
const BUS_STOP_CACHE_DURATION = parseInt(process.env.BUS_STOP_CACHE_DURATION || '300000');
const API_BASE = process.env.MONTEVIDEO_API_BASE;

/**
 * Helper function to check cache validity
 */
function isCacheValid(cacheEntry, duration) {
  return cacheEntry.data && (Date.now() - cacheEntry.timestamp < duration);
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * GET /api/buses/stops
 * Get all bus stops in Montevideo
 */
router.get('/stops', async (req, res) => {
  try {
    // Check cache first
    if (isCacheValid(cache.busstops, BUS_STOP_CACHE_DURATION)) {
      console.log('[Bus API] Returning cached bus stops');
      return res.json(cache.busstops.data);
    }

    const headers = await tokenManager.getAuthHeaders();
    const response = await axios.get(`${API_BASE}/buses/busstops`, { headers });

    // Update cache
    cache.busstops = {
      data: response.data,
      timestamp: Date.now()
    };

    console.log(`[Bus API] Fetched ${response.data.length} bus stops from API`);
    res.json(response.data);
  } catch (error) {
    console.error('[Bus API] Error fetching bus stops:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch bus stops',
      message: error.message
    });
  }
});

/**
 * GET /api/buses/positions
 * Get real-time bus positions
 */
router.get('/positions', async (req, res) => {
  try {
    // For real-time data, use shorter cache
    if (isCacheValid(cache.buses, BUS_CACHE_DURATION)) {
      console.log('[Bus API] Returning cached bus positions');
      return res.json(cache.buses.data);
    }

    const headers = await tokenManager.getAuthHeaders();

    // Try different possible endpoints for real-time bus data
    const possibleEndpoints = [
      '/buses',
      '/buses/location',
      '/buses/positions'
    ];

    let busData = null;
    let successfulEndpoint = null;

    for (const endpoint of possibleEndpoints) {
      try {
        console.log(`[Bus API] Trying endpoint: ${API_BASE}${endpoint}`);
        const response = await axios.get(`${API_BASE}${endpoint}`, { headers });
        busData = response.data;
        successfulEndpoint = endpoint;
        break;
      } catch (err) {
        console.log(`[Bus API] Endpoint ${endpoint} failed:`, err.response?.status || err.message);
        continue;
      }
    }

    if (busData) {
      // Update cache
      cache.buses = {
        data: busData,
        timestamp: Date.now()
      };

      console.log(`[Bus API] Found ${busData.length || 0} buses at ${successfulEndpoint}`);
      res.json(busData);
    } else {
      // If no real bus data available, return empty array
      console.log('[Bus API] No real-time bus endpoint found');
      res.json([]);
    }
  } catch (error) {
    console.error('[Bus API] Error fetching buses:', error.message);
    res.status(500).json({
      error: 'Failed to fetch bus positions',
      message: error.message
    });
  }
});

/**
 * GET /api/buses/lines/:lineId
 * Get buses for a specific line
 */
router.get('/lines/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    const headers = await tokenManager.getAuthHeaders();

    // Try to get buses for specific line
    const response = await axios.get(`${API_BASE}/buses/line/${lineId}`, { headers });
    console.log(`[Bus API] Fetched ${response.data.length || 0} buses for line ${lineId}`);
    res.json(response.data);
  } catch (error) {
    console.error(`[Bus API] Error fetching buses for line ${req.params.lineId}:`, error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch buses for line',
      message: error.message
    });
  }
});

/**
 * GET /api/buses/nearby/:lat/:lng/:radius
 * Get buses within a radius of a point (for incident integration)
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radius - Radius in meters
 */
router.get('/nearby/:lat/:lng/:radius', async (req, res) => {
  try {
    const lat = parseFloat(req.params.lat);
    const lng = parseFloat(req.params.lng);
    const radius = parseInt(req.params.radius);

    if (isNaN(lat) || isNaN(lng) || isNaN(radius)) {
      return res.status(400).json({ error: 'Invalid coordinates or radius' });
    }

    // Get all buses (will use cache if available)
    let buses;
    if (isCacheValid(cache.buses, BUS_CACHE_DURATION)) {
      buses = cache.buses.data;
    } else {
      const headers = await tokenManager.getAuthHeaders();
      const possibleEndpoints = ['/buses', '/buses/location', '/buses/positions'];

      for (const endpoint of possibleEndpoints) {
        try {
          const response = await axios.get(`${API_BASE}${endpoint}`, { headers });
          buses = response.data;
          cache.buses = { data: buses, timestamp: Date.now() };
          break;
        } catch (err) {
          continue;
        }
      }
    }

    if (!buses || !Array.isArray(buses)) {
      return res.json([]);
    }

    // Filter buses within radius
    const nearbyBuses = buses.filter(bus => {
      if (!bus.location || !bus.location.coordinates) return false;

      const [busLng, busLat] = bus.location.coordinates;
      const distance = calculateDistance(lat, lng, busLat, busLng);

      return distance <= radius;
    }).map(bus => {
      const [busLng, busLat] = bus.location.coordinates;
      const distance = calculateDistance(lat, lng, busLat, busLng);

      return {
        ...bus,
        distance: Math.round(distance)
      };
    }).sort((a, b) => a.distance - b.distance);

    console.log(`[Bus API] Found ${nearbyBuses.length} buses within ${radius}m of (${lat}, ${lng})`);
    res.json(nearbyBuses);
  } catch (error) {
    console.error('[Bus API] Error finding nearby buses:', error.message);
    res.status(500).json({
      error: 'Failed to find nearby buses',
      message: error.message
    });
  }
});

/**
 * GET /api/buses/token/status
 * Get token status (for debugging)
 */
router.get('/token/status', (req, res) => {
  const status = tokenManager.getTokenStatus();
  res.json(status);
});

export default router;
