import express from 'express';
import { HeatCell } from '../models/index.js';
import { checkJwt } from '../middleware/auth.js';
import geohash from 'ngeohash';

const router = express.Router();

/**
 * GET /heatmap
 * Get heatmap cells within a bounding box
 * Query params: bbox (lon1,lat1,lon2,lat2), precision (default 7)
 */
router.get('/', checkJwt, async (req, res, next) => {
  try {
    const { bbox, precision = 7 } = req.query;

    if (!bbox) {
      return res.status(400).json({ error: 'bbox parameter required' });
    }

    const coords = bbox.split(',').map(Number);
    if (coords.length !== 4) {
      return res.status(400).json({ error: 'Invalid bbox format. Use: lon1,lat1,lon2,lat2' });
    }

    const [lon1, lat1, lon2, lat2] = coords;

    // Get all geohashes that cover this bounding box
    const minHash = geohash.encode(lat1, lon1, precision);
    const maxHash = geohash.encode(lat2, lon2, precision);

    // Get all cells in range (approximate - geohash ranges are not exact rectangles)
    const cells = await HeatCell.find({
      geohash: { $gte: minHash, $lte: maxHash },
      score: { $gt: 0 }
    }).select('geohash score color incidentCount percentile updatedAt');

    // Convert to GeoJSON features
    const features = cells.map(cell => {
      const decoded = geohash.decode(cell.geohash);
      return {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [decoded.longitude, decoded.latitude]
        },
        properties: {
          geohash: cell.geohash,
          score: cell.score,
          color: cell.color,
          incidentCount: cell.incidentCount,
          percentile: cell.percentile,
          updatedAt: cell.updatedAt
        }
      };
    });

    res.json({
      type: 'FeatureCollection',
      features,
      meta: {
        totalCells: cells.length,
        precision
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
