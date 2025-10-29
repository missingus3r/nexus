import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Neighborhood from '../models/Neighborhood.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

/**
 * Load neighborhoods from GeoJSON file into MongoDB
 */
async function seedNeighborhoods() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    logger.info('Connected to MongoDB');

    // Read GeoJSON file
    const geojsonPath = path.join(__dirname, '../../data/montevideo_barrios.geojson');
    const geojsonData = JSON.parse(fs.readFileSync(geojsonPath, 'utf-8'));

    if (geojsonData.type !== 'FeatureCollection') {
      throw new Error('Invalid GeoJSON format. Expected FeatureCollection.');
    }

    // Clear existing neighborhoods
    await Neighborhood.deleteMany({});
    logger.info('Cleared existing neighborhoods');

    // Insert neighborhoods
    const neighborhoods = [];
    for (const feature of geojsonData.features) {
      const { id_barrio, nombre, codigo } = feature.properties;
      const { type, coordinates } = feature.geometry;

      neighborhoods.push({
        id_barrio,
        nombre,
        codigo,
        geometry: {
          type,
          coordinates
        },
        incidentCount: 0,
        averageColor: null
      });
    }

    await Neighborhood.insertMany(neighborhoods);
    logger.info(`Inserted ${neighborhoods.length} neighborhoods`);

    console.log(`✅ Successfully seeded ${neighborhoods.length} neighborhoods`);
    process.exit(0);
  } catch (error) {
    logger.error('Error seeding neighborhoods:', error);
    console.error('❌ Error seeding neighborhoods:', error.message);
    process.exit(1);
  }
}

seedNeighborhoods();
