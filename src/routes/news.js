import express from 'express';
import { NewsEvent } from '../models/index.js';
import { checkJwt } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /news
 * Fetch news events within a bounding box or near a location
 * Query params: bbox, lat, lon, radius, from, to, category, country, showAll
 */
router.get('/', checkJwt, async (req, res, next) => {
  try {
    const { bbox, lat, lon, radius, from, to, category, country, showAll } = req.query;

    const query = { hidden: false };

    // Proximity search (takes priority over country filter)
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      const searchRadius = radius ? parseInt(radius) : 100; // Default 100km

      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({ error: 'Invalid coordinates' });
      }

      // Use $near for proximity search (sorted by distance)
      // Convert km to meters for MongoDB
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: searchRadius * 1000 // Convert km to meters
        }
      };

      console.log(`Proximity search: lat=${latitude}, lon=${longitude}, radius=${searchRadius}km`);
    }
    // Country filter (unless showAll is true or proximity search is active)
    else if (!showAll || showAll === 'false') {
      if (country) {
        const countryCode = country.toUpperCase();

        // Special case for Uruguay: include news without country (local news)
        // Since all RSS feeds are Uruguayan, news without explicit country are assumed local
        if (countryCode === 'UY') {
          query.$or = [
            { country: 'UY' },
            { country: null },
            { country: { $exists: false } }
          ];
        } else {
          // For other countries, filter strictly
          query.country = countryCode;
        }
      }
    }

    // Bounding box filter (if no proximity search)
    if (bbox && !lat && !lon) {
      const coords = bbox.split(',').map(Number);
      if (coords.length !== 4) {
        return res.status(400).json({ error: 'Invalid bbox format. Use: lon1,lat1,lon2,lat2' });
      }
      const [lon1, lat1, lon2, lat2] = coords;
      query.location = {
        $geoWithin: {
          $box: [[lon1, lat1], [lon2, lat2]]
        }
      };
    }

    // Date range filter
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    // Category filter
    if (category) {
      query.category = category;
    }

    // For proximity search, don't add additional sort (already sorted by distance)
    // For other queries, sort by date
    let newsQuery = NewsEvent.find(query);

    if (!lat || !lon) {
      newsQuery = newsQuery.sort({ date: -1 });
    }

    const news = await newsQuery.limit(200);

    // Convert to GeoJSON FeatureCollection
    const featureCollection = {
      type: 'FeatureCollection',
      features: news.map(n => n.toGeoJSON())
    };

    res.json(featureCollection);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /news/:id
 * Get news event details
 */
router.get('/:id', checkJwt, async (req, res, next) => {
  try {
    const newsEvent = await NewsEvent.findById(req.params.id);
    if (!newsEvent || newsEvent.hidden) {
      return res.status(404).json({ error: 'News event not found' });
    }

    res.json(newsEvent);
  } catch (error) {
    next(error);
  }
});

export default router;
