import mongoose from 'mongoose';

const newsEventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  source: {
    type: String,
    required: true,
    description: 'News source (e.g., El País, El Observador)'
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  category: {
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
    index: true,
    description: 'Auto-classified incident type'
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
      required: true
    }
  },
  locationName: {
    type: String,
    description: 'Extracted place name from article'
  },
  country: {
    type: String,
    index: true,
    description: 'Country code (e.g., UY, AR, BR) extracted from geocoding'
  },
  date: {
    type: Date,
    required: true,
    index: true,
    description: 'Publication or incident date'
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0.5,
    description: 'Confidence in geocoding and classification'
  },
  dedupKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Hash for deduplication (title+location+date)'
  },
  excerpt: {
    type: String,
    maxlength: 1000,
    description: 'Article excerpt'
  },
  entities: [{
    text: String,
    entityType: String, // PERSON, PLACE, ORG, etc.
    confidence: Number
  }],
  metadata: {
    fetchedAt: {
      type: Date,
      default: Date.now
    },
    processingTime: Number,
    geocodingMethod: String
  },
  hidden: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
newsEventSchema.index({ location: '2dsphere' });
newsEventSchema.index({ category: 1, date: -1 });
newsEventSchema.index({ date: -1 });

// Methods
newsEventSchema.methods.toGeoJSON = function() {
  return {
    type: 'Feature',
    geometry: this.location,
    properties: {
      id: this._id,
      title: this.title,
      source: this.source,
      url: this.url,
      category: this.category,
      locationName: this.locationName,
      date: this.date,
      confidence: this.confidence,
      excerpt: this.excerpt
    }
  };
};

const NewsEvent = mongoose.model('NewsEvent', newsEventSchema);

export default NewsEvent;
