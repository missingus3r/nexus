import mongoose from 'mongoose';

const geoCacheSchema = new mongoose.Schema({
  cacheKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Cache key (e.g., "geo:montevideo" or "reverse:-34.9,-56.2")'
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    description: 'Cached data (string for reverse geocode, object for geocode)'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  }
}, {
  timestamps: false
});

// TTL index to automatically delete expired documents
geoCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const GeoCache = mongoose.model('GeoCache', geoCacheSchema);

export default GeoCache;
