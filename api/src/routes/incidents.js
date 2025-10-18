import express from 'express';
import { Incident, Validation } from '../models/index.js';
import { checkJwt, attachUser, requireScope } from '../middleware/auth.js';
import { writeRateLimiter } from '../middleware/rateLimiter.js';
import { validateIncident } from '../services/validationService.js';
import { updateHeatmapForIncident } from '../services/heatmapService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * GET /map/incidents
 * Fetch incidents within a bounding box
 * Query params: bbox (lon1,lat1,lon2,lat2), from, to, type, status
 */
router.get('/', checkJwt, async (req, res, next) => {
  try {
    const { bbox, from, to, type, status } = req.query;

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
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    // Type filter
    if (type) {
      query.type = type;
    }

    // Status filter (default to verified for guests)
    if (status) {
      query.status = status;
    } else if (!req.auth || req.auth.sub === 'guest') {
      query.status = 'verified'; // Guests only see verified
    }

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .limit(500); // Max 500 incidents

    // Convert to GeoJSON FeatureCollection
    const featureCollection = {
      type: 'FeatureCollection',
      features: incidents.map(i => i.toGeoJSON())
    };

    res.json(featureCollection);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /map/incidents
 * Create a new incident report
 * Requires: create:incident scope
 */
router.post('/', checkJwt, attachUser, requireScope('create:incident'), writeRateLimiter, async (req, res, next) => {
  try {
    const { type, severity, location, description, media } = req.body;

    if (!type || !location || !location.coordinates) {
      return res.status(400).json({
        error: 'Missing required fields: type, location.coordinates'
      });
    }

    // Create incident
    const incident = new Incident({
      type,
      severity: severity || 3,
      location,
      description,
      media: media || [],
      reporterUid: req.user.uid,
      reporterReputation: req.user.reputacion,
      status: 'pending'
    });

    await incident.save();

    logger.info('Incident created', {
      id: incident._id,
      type: incident.type,
      reporter: req.user.uid
    });

    // Emit socket event
    const io = req.app.get('io');
    io.emit('new-incident', incident.toGeoJSON());

    // Trigger heatmap update (async, don't wait)
    updateHeatmapForIncident(incident._id).catch(err =>
      logger.error('Heatmap update failed:', err)
    );

    res.status(201).json({
      id: incident._id,
      status: incident.status,
      message: 'Incident reported successfully. Awaiting validation.'
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /map/incidents/:id/validate
 * Validate (vote on) an incident
 * Requires: validate:incident scope
 */
router.post('/:id/validate', checkJwt, attachUser, requireScope('validate:incident'), writeRateLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vote, confidence, comment } = req.body;

    if (![1, -1].includes(vote)) {
      return res.status(400).json({ error: 'Vote must be 1 (valid) or -1 (invalid)' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Check if user already validated this incident
    const existing = await Validation.findOne({
      incidentId: id,
      uid: req.user.uid
    });

    if (existing) {
      return res.status(409).json({ error: 'You have already validated this incident' });
    }

    // Create validation
    const validation = new Validation({
      incidentId: id,
      uid: req.user.uid,
      vote,
      confidence: confidence || 0.5,
      validatorReputation: req.user.reputacion,
      comment
    });

    await validation.save();

    // Update incident validation score
    const result = await validateIncident(id);

    logger.info('Incident validated', {
      incidentId: id,
      validator: req.user.uid,
      vote,
      newStatus: result.status
    });

    // Emit socket event
    const io = req.app.get('io');
    io.emit('incident-validated', {
      incidentId: id,
      status: result.status,
      validationScore: result.validationScore
    });

    // Update heatmap if status changed to verified
    if (result.status === 'verified') {
      updateHeatmapForIncident(id).catch(err =>
        logger.error('Heatmap update failed:', err)
      );
    }

    res.json({
      message: 'Validation recorded',
      incident: {
        id: incident._id,
        status: result.status,
        validationScore: result.validationScore,
        validationCount: result.validationCount
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /map/incidents/:id
 * Get incident details
 */
router.get('/:id', checkJwt, async (req, res, next) => {
  try {
    const incident = await Incident.findById(req.params.id);
    if (!incident || incident.hidden) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    const validations = await Validation.find({ incidentId: req.params.id })
      .select('-uid') // Don't expose validator identities
      .sort({ createdAt: -1 });

    res.json({
      ...incident.toGeoJSON(),
      validations: validations.map(v => ({
        vote: v.vote,
        confidence: v.confidence,
        comment: v.comment,
        createdAt: v.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
