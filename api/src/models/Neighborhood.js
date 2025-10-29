import mongoose from 'mongoose';

const neighborhoodSchema = new mongoose.Schema({
  id_barrio: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  nombre: {
    type: String,
    required: true,
    index: true
  },
  codigo: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  geometry: {
    type: {
      type: String,
      enum: ['Polygon', 'MultiPolygon'],
      required: true
    },
    coordinates: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  // Calculated heatmap data
  incidentCount: {
    type: Number,
    default: 0,
    description: 'Number of verified incidents in this neighborhood'
  },
  averageColor: {
    type: String,
    description: 'Average color of incidents in hex format (e.g., #ff5733)'
  },
  lastIncidentAt: {
    type: Date,
    description: 'Timestamp of most recent incident'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 2dsphere index for geospatial queries
neighborhoodSchema.index({ geometry: '2dsphere' });

// Methods
neighborhoodSchema.methods.toGeoJSON = function() {
  return {
    type: 'Feature',
    geometry: this.geometry,
    properties: {
      id_barrio: this.id_barrio,
      nombre: this.nombre,
      codigo: this.codigo,
      incidentCount: this.incidentCount,
      averageColor: this.averageColor,
      lastIncidentAt: this.lastIncidentAt
    }
  };
};

const Neighborhood = mongoose.model('Neighborhood', neighborhoodSchema);

export default Neighborhood;
