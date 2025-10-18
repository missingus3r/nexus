import mongoose from 'mongoose';
import geohash from 'ngeohash';

const incidentSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: [
      'homicidio',
      'rapiña',
      'hurto',
      'copamiento',
      'violencia_domestica',
      'narcotrafico',
      'otro'
    ],
    index: true
  },
  severity: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 3,
    description: 'Severity level: 1=minor, 5=critical'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      validate: {
        validator: function(coords) {
          return coords.length === 2 &&
                 coords[0] >= -180 && coords[0] <= 180 &&
                 coords[1] >= -90 && coords[1] <= 90;
        },
        message: 'Invalid coordinates'
      }
    }
  },
  geohash: {
    type: String,
    required: true,
    index: true,
    description: 'Geohash precision 6-7 for heatmap cells'
  },
  description: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  media: [{
    url: String,
    type: {
      type: String,
      enum: ['image', 'video']
    },
    hash: String, // SHA-256
    uploadedAt: Date
  }],
  reporterUid: {
    type: String,
    required: true,
    index: true,
    description: 'Auth0 UID of reporter'
  },
  reporterReputation: {
    type: Number,
    required: true,
    description: 'Reputation at time of report (for historical scoring)'
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'hidden'],
    default: 'pending',
    index: true
  },
  validationScore: {
    type: Number,
    default: 0,
    description: 'Weighted validation score (-1 to 1)'
  },
  validationCount: {
    type: Number,
    default: 0
  },
  evidenceHash: {
    type: String,
    description: 'SHA-256 hash of incident data for integrity'
  },
  hidden: {
    type: Boolean,
    default: false
  },
  hiddenReason: String,
  moderatedBy: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
incidentSchema.index({ location: '2dsphere' });
incidentSchema.index({ geohash: 1, createdAt: -1 });
incidentSchema.index({ status: 1, createdAt: -1 });

// Pre-save middleware: calculate geohash if not provided
incidentSchema.pre('save', function(next) {
  if (!this.geohash && this.location && this.location.coordinates) {
    const [lon, lat] = this.location.coordinates;
    this.geohash = geohash.encode(lat, lon, 7); // precision 7 (~153m x 153m)
  }
  next();
});

// Methods
incidentSchema.methods.calculateAge = function() {
  return Date.now() - this.createdAt.getTime();
};

incidentSchema.methods.toGeoJSON = function() {
  return {
    type: 'Feature',
    geometry: this.location,
    properties: {
      id: this._id,
      type: this.type,
      severity: this.severity,
      description: this.description,
      status: this.status,
      validationScore: this.validationScore,
      createdAt: this.createdAt,
      media: this.media.map(m => ({ url: m.url, type: m.type }))
    }
  };
};

const Incident = mongoose.model('Incident', incidentSchema);

export default Incident;
