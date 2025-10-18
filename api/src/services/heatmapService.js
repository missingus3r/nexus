import { Incident, HeatCell, User } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Calculate decay factor based on incident age
 * Uses exponential decay with configurable half-life
 * @param {Date} createdAt - Incident creation date
 * @param {Number} halfLifeDays - Half-life in days (default 7)
 * @returns {Number} Decay factor (0-1)
 */
export function calculateDecay(createdAt, halfLifeDays = 7) {
  const ageMs = Date.now() - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const halfLife = halfLifeDays;
  return Math.exp(-Math.log(2) * ageDays / halfLife);
}

/**
 * Calculate score for a single incident
 * @param {Object} incident - Incident document
 * @param {Number} reporterReputation - Reporter's reputation (0-100)
 * @returns {Number} Incident score
 */
export function calculateIncidentScore(incident, reporterReputation = 50) {
  // Base components
  const decay = calculateDecay(incident.createdAt, 7);
  const severityWeight = incident.severity; // 1-5
  const reputationWeight = Math.max(0, reporterReputation / 100); // 0-1

  // Combined score: decay × severity × (0.5 + 0.5 × reputation)
  // This ensures minimum 50% weight even for low reputation users
  const score = decay * severityWeight * (0.5 + 0.5 * reputationWeight);

  return score;
}

/**
 * Update heatmap for a specific incident
 * Called when incident is created or verified
 * @param {String} incidentId - Incident ID
 */
export async function updateHeatmapForIncident(incidentId) {
  try {
    const incident = await Incident.findById(incidentId);
    if (!incident || incident.status !== 'verified') {
      return;
    }

    const geohash = incident.geohash;

    // Get all verified incidents in this cell
    const incidents = await Incident.find({
      geohash,
      status: 'verified',
      hidden: false
    });

    // Calculate aggregate score
    let totalScore = 0;
    for (const inc of incidents) {
      // Use stored reputation at time of report
      const score = calculateIncidentScore(inc, inc.reporterReputation);
      totalScore += score;
    }

    // Update or create heat cell
    const cell = await HeatCell.findOneAndUpdate(
      { geohash },
      {
        score: totalScore,
        incidentCount: incidents.length,
        lastIncidentAt: incident.createdAt,
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    logger.info('Heatmap cell updated', {
      geohash,
      score: totalScore,
      incidentCount: incidents.length
    });

    // Update percentiles (async, don't await)
    updatePercentiles().catch(err =>
      logger.error('Percentile update failed:', err)
    );

    return cell;
  } catch (error) {
    logger.error('Error updating heatmap:', error);
    throw error;
  }
}

/**
 * Update color thresholds for all cells based on percentiles
 * Called periodically and after cell updates
 */
export async function updatePercentiles() {
  try {
    const cells = await HeatCell.find({ score: { $gt: 0 } }).sort({ score: 1 });

    if (cells.length === 0) return;

    // Calculate percentile thresholds
    const scores = cells.map(c => c.score);
    const p50Index = Math.floor(scores.length * 0.50);
    const p75Index = Math.floor(scores.length * 0.75);

    const p50Threshold = scores[p50Index];
    const p75Threshold = scores[p75Index];

    logger.info('Percentile thresholds', { p50: p50Threshold, p75: p75Threshold });

    // Update all cells with their color
    const bulkOps = cells.map((cell, index) => {
      const percentile = (index / cells.length) * 100;
      let color = 'green';

      if (cell.score >= p75Threshold) {
        color = 'red';
      } else if (cell.score >= p50Threshold) {
        color = 'yellow';
      }

      return {
        updateOne: {
          filter: { _id: cell._id },
          update: { color, percentile }
        }
      };
    });

    await HeatCell.bulkWrite(bulkOps);
    logger.info(`Updated colors for ${cells.length} cells`);
  } catch (error) {
    logger.error('Error updating percentiles:', error);
    throw error;
  }
}

/**
 * Rebuild entire heatmap from scratch
 * Useful for maintenance or after algorithm changes
 */
export async function rebuildHeatmap() {
  try {
    logger.info('Starting heatmap rebuild...');

    // Clear existing cells
    await HeatCell.deleteMany({});

    // Get all verified incidents
    const incidents = await Incident.find({
      status: 'verified',
      hidden: false
    });

    // Group by geohash
    const cellMap = new Map();

    for (const incident of incidents) {
      const geohash = incident.geohash;
      if (!cellMap.has(geohash)) {
        cellMap.set(geohash, []);
      }
      cellMap.get(geohash).push(incident);
    }

    // Create cells
    const cells = [];
    for (const [geohash, incidents] of cellMap) {
      let totalScore = 0;
      let lastIncidentAt = incidents[0].createdAt;

      for (const inc of incidents) {
        const score = calculateIncidentScore(inc, inc.reporterReputation);
        totalScore += score;
        if (inc.createdAt > lastIncidentAt) {
          lastIncidentAt = inc.createdAt;
        }
      }

      cells.push({
        geohash,
        score: totalScore,
        incidentCount: incidents.length,
        lastIncidentAt
      });
    }

    await HeatCell.insertMany(cells);
    await updatePercentiles();

    logger.info(`Heatmap rebuilt: ${cells.length} cells created`);
    return { cellsCreated: cells.length };
  } catch (error) {
    logger.error('Error rebuilding heatmap:', error);
    throw error;
  }
}
