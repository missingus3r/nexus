import express from 'express';
import { Neighborhood } from '../models/index.js';
import { verifyApiAuth } from '../middleware/apiAuth.js';
import { updateNeighborhoodHeatmap, updateAllNeighborhoodsHeatmap } from '../services/neighborhoodService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /neighborhoods
 * Get all neighborhoods with heatmap data
 * Returns GeoJSON FeatureCollection
 */
router.get('/', verifyApiAuth, async (req, res, next) => {
  try {
    const { withIncidents } = req.query;

    const query = {};

    // Only return neighborhoods with incidents if requested
    if (withIncidents === 'true') {
      query.incidentCount = { $gt: 0 };
    }

    const neighborhoods = await Neighborhood.find(query);

    // Convert to GeoJSON FeatureCollection
    const featureCollection = {
      type: 'FeatureCollection',
      features: neighborhoods.map(n => n.toGeoJSON())
    };

    res.json(featureCollection);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /neighborhoods/:id
 * Get specific neighborhood by ID
 */
router.get('/:id', verifyApiAuth, async (req, res, next) => {
  try {
    const neighborhood = await Neighborhood.findOne({ id_barrio: parseInt(req.params.id) });

    if (!neighborhood) {
      return res.status(404).json({ error: 'Neighborhood not found' });
    }

    res.json(neighborhood.toGeoJSON());
  } catch (error) {
    next(error);
  }
});

/**
 * POST /neighborhoods/:id/update-heatmap
 * Manually trigger heatmap update for a specific neighborhood
 * Admin only
 */
router.post('/:id/update-heatmap', verifyApiAuth, async (req, res, next) => {
  try {
    const neighborhoodId = parseInt(req.params.id);
    const neighborhood = await updateNeighborhoodHeatmap(neighborhoodId);

    if (!neighborhood) {
      return res.status(404).json({ error: 'Neighborhood not found' });
    }

    res.json({
      message: 'Neighborhood heatmap updated',
      neighborhood: neighborhood.toGeoJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /neighborhoods/update-all-heatmaps
 * Manually trigger heatmap update for all neighborhoods
 * Admin only
 */
router.post('/update-all-heatmaps', verifyApiAuth, async (req, res, next) => {
  try {
    const result = await updateAllNeighborhoodsHeatmap();

    res.json({
      message: 'All neighborhood heatmaps updated',
      ...result
    });
  } catch (error) {
    next(error);
  }
});

export default router;
