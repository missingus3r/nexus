import express from 'express';
import { Incident, Validation, Notification } from '../models/index.js';
import { verifyApiAuth, requireAuth } from '../middleware/apiAuth.js';
import { writeRateLimiter } from '../middleware/rateLimiter.js';
import { validateIncident } from '../services/validationService.js';
import { updateHeatmapForIncident } from '../services/heatmapService.js';
import { assignNeighborhoodToIncident, updateNeighborhoodHeatmap } from '../services/neighborhoodService.js';
import { uploadIncidentPhotos, handleUploadErrors } from '../middleware/upload.js';
import logger from '../utils/logger.js';
import crypto from 'crypto';
import fs from 'fs';

const router = express.Router();

/**
 * GET /map/incidents
 * Fetch incidents within a bounding box
 * Query params: bbox (lon1,lat1,lon2,lat2), from, to, type, status, limit
 */
router.get('/', verifyApiAuth, async (req, res, next) => {
  try {
    const { bbox, from, to, type, status, limit } = req.query;

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

    // Status filter
    if (status) {
      query.status = status;
    } else if (!req.auth || req.auth.sub === 'guest' || req.auth.type === 'guest') {
      // Guests only see verified and auto-verified incidents
      query.status = { $in: ['verified', 'auto_verified'] };
    }
    // Authenticated users see all incidents (pending, verified, rejected, auto_verified) by default

    // Limit filter (default 500, max 500)
    const maxResults = limit ? Math.min(parseInt(limit), 500) : 500;

    const incidents = await Incident.find(query)
      .sort({ createdAt: -1 })
      .limit(maxResults);

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
 * Create a new incident report with optional photos
 * Requires: authenticated user
 * Body: multipart/form-data with fields: type, severity, location, description, photos (optional)
 */
router.post('/', verifyApiAuth, requireAuth, writeRateLimiter, uploadIncidentPhotos, handleUploadErrors, async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      // Clean up uploaded files if auth fails
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(401).json({ error: 'Necesitas estar logeado para realizar esta acción' });
    }

    const { type, severity, description, locationType, approximateRadius } = req.body;

    // Parse location from JSON string (multipart/form-data sends everything as strings)
    let location;
    try {
      location = typeof req.body.location === 'string'
        ? JSON.parse(req.body.location)
        : req.body.location;
    } catch (e) {
      // Clean up uploaded files if parsing fails
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(400).json({
        error: 'Invalid location format. Must be valid JSON with coordinates.'
      });
    }

    if (!type || !location || !location.coordinates) {
      // Clean up uploaded files if validation fails
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(400).json({
        error: 'Missing required fields: type, location.coordinates'
      });
    }

    // Check if user has pending reports
    const pendingReport = await Incident.findOne({
      reporterUid: req.user.uid,
      status: 'pending'
    });

    if (pendingReport) {
      // Clean up uploaded files if user has pending report
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(403).json({
        error: 'You have a pending report that needs to be validated before creating a new one',
        pendingReportId: pendingReport._id
      });
    }

    // Process uploaded photos
    const media = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Generate file hash for integrity
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        media.push({
          url: `/uploads/${file.filename}`,
          type: 'image',
          hash: fileHash,
          uploadedAt: new Date()
        });
      }
    }

    // Create incident
    const incidentData = {
      type,
      severity: severity ? parseInt(severity) : 3,
      location,
      description,
      media,
      reporterUid: req.user.uid,
      reporterReputation: req.user.reputacion,
      status: 'pending',
      locationType: locationType || 'exact'
    };

    // Add approximate radius if location type is approximate
    if (locationType === 'approximate' && approximateRadius) {
      incidentData.approximateRadius = parseInt(approximateRadius);
    }

    const incident = new Incident(incidentData);

    await incident.save();

    // Increment user's report count
    await req.user.incrementReportCount();

    // Assign neighborhood to incident (async, don't wait)
    assignNeighborhoodToIncident(incident._id).catch(err =>
      logger.error('Neighborhood assignment failed:', err)
    );

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
 * Requires: authenticated user
 */
router.post('/:id/validate', verifyApiAuth, requireAuth, writeRateLimiter, async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ error: 'Necesitas estar logeado para realizar esta acción' });
    }

    const { id } = req.params;
    const { vote, confidence, comment } = req.body;

    if (![1, -1].includes(vote)) {
      return res.status(400).json({ error: 'Vote must be 1 (valid) or -1 (invalid)' });
    }

    const incident = await Incident.findById(id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Auto-verified incidents cannot be validated (already verified by the system)
    if (incident.status === 'auto_verified' || incident.autoGenerated) {
      return res.status(403).json({
        error: 'This incident was auto-verified from news sources and cannot be manually validated',
        autoGenerated: true
      });
    }

    // Check if user is trying to validate their own report
    if (incident.reporterUid === req.user.uid) {
      return res.status(403).json({ error: 'You cannot validate your own report' });
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

    // Increment user's validation count
    await req.user.incrementValidationCount();

    // Give small reputation boost for participating in validation
    await req.user.updateReputation(+2);

    // Update incident validation score
    const result = await validateIncident(id);

    // Create notification for reporter
    const statusMessages = {
      'verified': '✅ Tu reporte fue verificado',
      'rejected': '❌ Tu reporte fue rechazado',
      'pending': 'Tu reporte recibió una nueva validación'
    };

    if (incident.reporterUid && incident.reporterUid !== req.user.uid) {
      await Notification.createNotification(
        incident.reporterUid,
        'incident_validated',
        statusMessages[result.status] || 'Tu reporte fue validado',
        `Tu reporte de ${incident.type} recibió ${result.validationCount} validaciones. Estado: ${result.status}`,
        { incidentId: id, status: result.status, validationScore: result.validationScore }
      );
    }

    logger.info('Incident validated', {
      incidentId: id,
      validator: req.user.uid,
      vote,
      newStatus: result.status,
      validatorReputation: req.user.reputacion
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

      // Update neighborhood heatmap if incident has neighborhood assigned
      if (incident.neighborhoodId) {
        updateNeighborhoodHeatmap(incident.neighborhoodId).catch(err =>
          logger.error('Neighborhood heatmap update failed:', err)
        );
      }
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
 * POST /map/incidents/:id/photos
 * Add photos to an existing incident
 * Requires: authenticated user and must be the reporter
 */
router.post('/:id/photos', verifyApiAuth, requireAuth, writeRateLimiter, uploadIncidentPhotos, handleUploadErrors, async (req, res, next) => {
  try {
    if (!req.user) {
      // Clean up uploaded files if auth fails
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(401).json({ error: 'Necesitas estar logeado para realizar esta acción' });
    }

    const incident = await Incident.findById(req.params.id);
    if (!incident) {
      // Clean up uploaded files if incident not found
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(404).json({ error: 'Incident not found' });
    }

    // Check if user is the reporter
    if (incident.reporterUid !== req.user.uid) {
      // Clean up uploaded files if not the reporter
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(403).json({ error: 'Only the reporter can add photos to this incident' });
    }

    // Check if incident already has 3 photos
    if (incident.media.length >= 3) {
      // Clean up uploaded files if already has 3 photos
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(400).json({
        error: 'Maximum 3 photos allowed per incident',
        currentCount: incident.media.length
      });
    }

    // Check if adding these files would exceed the limit
    const totalPhotos = incident.media.length + (req.files ? req.files.length : 0);
    if (totalPhotos > 3) {
      // Clean up uploaded files if would exceed limit
      if (req.files) {
        req.files.forEach(file => fs.unlinkSync(file.path));
      }
      return res.status(400).json({
        error: `Cannot add ${req.files.length} photos. Only ${3 - incident.media.length} more photo(s) allowed`,
        currentCount: incident.media.length,
        maxAllowed: 3
      });
    }

    // Process uploaded photos
    const newMedia = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        // Generate file hash for integrity
        const fileBuffer = fs.readFileSync(file.path);
        const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

        newMedia.push({
          url: `/uploads/${file.filename}`,
          type: 'image',
          hash: fileHash,
          uploadedAt: new Date()
        });
      }

      // Add new photos to existing media
      incident.media.push(...newMedia);
      await incident.save();

      logger.info('Photos added to incident', {
        incidentId: incident._id,
        photosAdded: newMedia.length,
        totalPhotos: incident.media.length,
        addedBy: req.user.uid
      });

      res.json({
        message: 'Photos added successfully',
        photosAdded: newMedia.length,
        totalPhotos: incident.media.length,
        incident: incident.toGeoJSON()
      });
    } else {
      return res.status(400).json({ error: 'No photos provided' });
    }
  } catch (error) {
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {
          logger.error('Error deleting file:', e);
        }
      });
    }
    next(error);
  }
});

/**
 * GET /map/incidents/:id
 * Get incident details
 */
router.get('/:id', verifyApiAuth, async (req, res, next) => {
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
