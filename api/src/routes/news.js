import express from 'express';
import { NewsEvent } from '../models/index.js';
import { checkJwt } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /news
 * Fetch news events within a bounding box
 * Query params: bbox, from, to, category
 */
router.get('/', checkJwt, async (req, res, next) => {
  try {
    const { bbox, from, to, category } = req.query;

    const query = { hidden: false };

    // Bounding box filter
    if (bbox) {
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

    const news = await NewsEvent.find(query)
      .sort({ date: -1 })
      .limit(200);

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
