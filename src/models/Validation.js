import mongoose from 'mongoose';

const validationSchema = new mongoose.Schema({
  incidentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Incident',
    required: true,
    index: true
  },
  uid: {
    type: String,
    required: true,
    index: true,
    description: 'Auth0 UID of validator'
  },
  vote: {
    type: Number,
    required: true,
    enum: [-1, 1],
    description: '+1 for valid, -1 for invalid/fake'
  },
  confidence: {
    type: Number,
    required: true,
    min: 0,
    max: 1,
    default: 0.5,
    description: 'Validator confidence level (0-1)'
  },
  validatorReputation: {
    type: Number,
    required: true,
    description: 'Reputation at time of validation (for weighting)'
  },
  comment: {
    type: String,
    maxlength: 500,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate validations
validationSchema.index({ incidentId: 1, uid: 1 }, { unique: true });

// Methods
validationSchema.methods.getWeight = function() {
  // Weight based on reputation and confidence
  const reputationWeight = this.validatorReputation / 100; // 0-1
  return reputationWeight * this.confidence;
};

const Validation = mongoose.model('Validation', validationSchema);

export default Validation;
