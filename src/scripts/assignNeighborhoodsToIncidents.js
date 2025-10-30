import mongoose from 'mongoose';
import { Incident } from '../models/index.js';
import { assignNeighborhoodToIncident, updateAllNeighborhoodsHeatmap } from '../services/neighborhoodService.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Assign neighborhoods to all existing incidents
 * and update neighborhood heatmaps
 */
async function assignNeighborhoodsToIncidents() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');

    // Get all incidents
    const incidents = await Incident.find({});
    logger.info(`Found ${incidents.length} incidents`);

    let assigned = 0;
    let notFound = 0;

    // Assign neighborhood to each incident
    for (const incident of incidents) {
      try {
        const updated = await assignNeighborhoodToIncident(incident._id);
        if (updated.neighborhoodId) {
          assigned++;
        } else {
          notFound++;
        }
      } catch (error) {
        logger.error('Error assigning neighborhood to incident:', {
          incidentId: incident._id,
          error: error.message
        });
      }
    }

    logger.info('Assignment complete', { assigned, notFound });

    // Update all neighborhood heatmaps
    logger.info('Updating neighborhood heatmaps...');
    await updateAllNeighborhoodsHeatmap();

    console.log(`✅ Successfully assigned neighborhoods to ${assigned} incidents`);
    console.log(`⚠️  ${notFound} incidents have no neighborhood (outside defined areas)`);
    process.exit(0);
  } catch (error) {
    logger.error('Error assigning neighborhoods:', error);
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignNeighborhoodsToIncidents();
