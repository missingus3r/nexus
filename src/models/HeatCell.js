import mongoose from 'mongoose';

const heatCellSchema = new mongoose.Schema({
  geohash: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Geohash identifier for the cell (precision 6-7)'
  },
  score: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
    description: 'Aggregated heat score for the cell'
  },
  incidentCount: {
    type: Number,
    default: 0,
    description: 'Number of verified incidents in this cell'
  },
  lastIncidentAt: {
    type: Date,
    description: 'Timestamp of most recent incident'
  },
  color: {
    type: String,
    enum: ['green', 'yellow', 'red'],
    default: 'green',
    description: 'Heatmap color based on percentile thresholds'
  },
  percentile: {
    type: Number,
    min: 0,
    max: 100,
    description: 'Percentile rank among all cells'
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Index for sorting by score
heatCellSchema.index({ score: -1 });

// Methods
heatCellSchema.methods.setColorByPercentile = function(percentile) {
  this.percentile = percentile;
  if (percentile >= 75) {
    this.color = 'red';
  } else if (percentile >= 50) {
    this.color = 'yellow';
  } else {
    this.color = 'green';
  }
};

heatCellSchema.methods.toJSON = function() {
  return {
    geohash: this.geohash,
    score: this.score,
    color: this.color,
    incidentCount: this.incidentCount,
    percentile: this.percentile,
    updatedAt: this.updatedAt
  };
};

const HeatCell = mongoose.model('HeatCell', heatCellSchema);

export default HeatCell;
