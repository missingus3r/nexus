import { Incident, Neighborhood } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Color mapping for incident types
 */
const INCIDENT_COLORS = {
  'homicidio': '#d32f2f',      // red
  'rapiña': '#f57c00',          // orange
  'hurto': '#fbc02d',           // yellow
  'copamiento': '#c62828',      // dark red
  'violencia_domestica': '#e91e63', // pink
  'narcotrafico': '#9c27b0',    // purple
  'otro': '#757575'             // gray
};

/**
 * Find the neighborhood containing a given point
 * @param {Number} lon - Longitude
 * @param {Number} lat - Latitude
 * @returns {Object|null} Neighborhood document or null
 */
export async function findNeighborhoodByLocation(lon, lat) {
  try {
    const neighborhood = await Neighborhood.findOne({
      geometry: {
        $geoIntersects: {
          $geometry: {
            type: 'Point',
            coordinates: [lon, lat]
          }
        }
      }
    });

    return neighborhood;
  } catch (error) {
    logger.error('Error finding neighborhood:', error);
    return null;
  }
}

/**
 * Assign neighborhood to an incident
 * @param {String} incidentId - Incident ID
 * @returns {Object|null} Updated incident or null
 */
export async function assignNeighborhoodToIncident(incidentId) {
  try {
    const incident = await Incident.findById(incidentId);
    if (!incident) {
      throw new Error('Incident not found');
    }

    const [lon, lat] = incident.location.coordinates;
    const neighborhood = await findNeighborhoodByLocation(lon, lat);

    if (neighborhood) {
      incident.neighborhoodId = neighborhood.id_barrio;
      incident.neighborhoodName = neighborhood.nombre;
      await incident.save();

      logger.info('Neighborhood assigned to incident', {
        incidentId,
        neighborhoodId: neighborhood.id_barrio,
        neighborhoodName: neighborhood.nombre
      });

      return incident;
    }

    logger.warn('No neighborhood found for incident', {
      incidentId,
      coordinates: [lon, lat]
    });

    return incident;
  } catch (error) {
    logger.error('Error assigning neighborhood:', error);
    throw error;
  }
}

/**
 * Convert hex color to RGB
 * @param {String} hex - Hex color (e.g., '#ff5733')
 * @returns {Object} { r, g, b }
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Convert RGB to hex color
 * @param {Number} r - Red (0-255)
 * @param {Number} g - Green (0-255)
 * @param {Number} b - Blue (0-255)
 * @returns {String} Hex color
 */
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

/**
 * Calculate average color from multiple hex colors
 * @param {Array<String>} colors - Array of hex colors
 * @returns {String} Average color in hex format
 */
export function calculateAverageColor(colors) {
  if (colors.length === 0) return null;

  let totalR = 0, totalG = 0, totalB = 0;

  for (const color of colors) {
    const rgb = hexToRgb(color);
    if (rgb) {
      totalR += rgb.r;
      totalG += rgb.g;
      totalB += rgb.b;
    }
  }

  const avgR = totalR / colors.length;
  const avgG = totalG / colors.length;
  const avgB = totalB / colors.length;

  return rgbToHex(avgR, avgG, avgB);
}

/**
 * Update neighborhood heatmap data
 * Called when an incident is verified
 * @param {Number} neighborhoodId - Neighborhood ID
 */
export async function updateNeighborhoodHeatmap(neighborhoodId) {
  try {
    const neighborhood = await Neighborhood.findOne({ id_barrio: neighborhoodId });
    if (!neighborhood) {
      logger.warn('Neighborhood not found', { neighborhoodId });
      return;
    }

    // Get all verified incidents in this neighborhood
    const incidents = await Incident.find({
      neighborhoodId,
      status: 'verified',
      hidden: false
    });

    if (incidents.length === 0) {
      // No incidents - clear the heatmap data
      neighborhood.incidentCount = 0;
      neighborhood.averageColor = null;
      neighborhood.lastIncidentAt = null;
      await neighborhood.save();

      logger.info('Neighborhood heatmap cleared (no incidents)', {
        neighborhoodId,
        neighborhoodName: neighborhood.nombre
      });

      return neighborhood;
    }

    // Calculate average color
    const colors = incidents.map(inc => INCIDENT_COLORS[inc.type] || INCIDENT_COLORS['otro']);
    const averageColor = calculateAverageColor(colors);

    // Find most recent incident
    const lastIncident = incidents.reduce((latest, inc) =>
      inc.createdAt > latest.createdAt ? inc : latest
    );

    // Update neighborhood
    neighborhood.incidentCount = incidents.length;
    neighborhood.averageColor = averageColor;
    neighborhood.lastIncidentAt = lastIncident.createdAt;
    neighborhood.updatedAt = new Date();

    await neighborhood.save();

    logger.info('Neighborhood heatmap updated', {
      neighborhoodId,
      neighborhoodName: neighborhood.nombre,
      incidentCount: incidents.length,
      averageColor
    });

    return neighborhood;
  } catch (error) {
    logger.error('Error updating neighborhood heatmap:', error);
    throw error;
  }
}

/**
 * Update all neighborhoods' heatmap data
 * Useful for bulk updates or maintenance
 */
export async function updateAllNeighborhoodsHeatmap() {
  try {
    const neighborhoods = await Neighborhood.find({});

    logger.info(`Updating heatmap for ${neighborhoods.length} neighborhoods...`);

    for (const neighborhood of neighborhoods) {
      await updateNeighborhoodHeatmap(neighborhood.id_barrio);
    }

    logger.info('All neighborhoods heatmap updated');
    return { updated: neighborhoods.length };
  } catch (error) {
    logger.error('Error updating all neighborhoods:', error);
    throw error;
  }
}
