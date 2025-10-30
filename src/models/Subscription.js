import mongoose from 'mongoose';

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  plan: {
    type: String,
    enum: ['free', 'premium', 'pro'],
    default: 'free',
    required: true
  },
  planType: {
    type: String,
    enum: ['personal'],
    required: true,
    description: 'Type of plan: personal'
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'cancelled', 'expired', 'trial'],
    default: 'active',
    required: true
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly'],
    default: 'monthly'
  },
  price: {
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      enum: ['USD', 'UYU'],
      default: 'USD'
    }
  },
  startDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  endDate: {
    type: Date,
    required: true,
    description: 'Subscription expiration date'
  },
  autoRenew: {
    type: Boolean,
    default: false
  },
  features: {
    incidentReportsPerMonth: {
      type: Number,
      default: 5,
      description: 'Number of incident reports allowed per month'
    },
    customAlerts: {
      type: Boolean,
      default: false,
      description: 'Can create custom zone alerts'
    },
    historicalData: {
      type: Boolean,
      default: false,
      description: 'Access to historical incident data'
    },
    apiAccess: {
      type: Boolean,
      default: false,
      description: 'API access for integrations'
    },
    surlinkHighlights: {
      type: Number,
      default: 0,
      description: 'Number of highlighted Surlink listings per month'
    },
    surlinkFavorites: {
      type: Boolean,
      default: false,
      description: 'Save favorite Surlink listings'
    },
    prioritySupport: {
      type: Boolean,
      default: false,
      description: 'Priority customer support'
    }
  },
  metadata: {
    paymentMethod: String,
    transactionId: String,
    contactEmail: String,
    companyName: String,
    taxId: String,
    notes: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

// Methods
subscriptionSchema.methods.isActive = function() {
  return this.status === 'active' && this.endDate > new Date();
};

subscriptionSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.autoRenew = false;
  return this.save();
};

subscriptionSchema.methods.renew = function(months = 1) {
  const newEndDate = new Date(this.endDate);
  newEndDate.setMonth(newEndDate.getMonth() + months);
  this.endDate = newEndDate;
  this.status = 'active';
  return this.save();
};

subscriptionSchema.methods.hasFeature = function(featureName) {
  return this.features[featureName] === true || this.features[featureName] > 0;
};

// Static methods
subscriptionSchema.statics.getPlanFeatures = function(planName) {
  const plans = {
    free: {
      incidentReportsPerMonth: 5,
      customAlerts: false,
      historicalData: false,
      apiAccess: false,
      surlinkHighlights: 0,
      surlinkFavorites: false,
      prioritySupport: false
    },
    premium: {
      incidentReportsPerMonth: -1, // unlimited
      customAlerts: true,
      historicalData: true,
      apiAccess: false,
      surlinkHighlights: 0,
      surlinkFavorites: true,
      prioritySupport: false
    },
    pro: {
      incidentReportsPerMonth: -1,
      customAlerts: true,
      historicalData: true,
      apiAccess: true,
      surlinkHighlights: 0,
      surlinkFavorites: true,
      prioritySupport: false
    }
  };

  return plans[planName] || plans.free;
};

const Subscription = mongoose.model('Subscription', subscriptionSchema);

export default Subscription;
