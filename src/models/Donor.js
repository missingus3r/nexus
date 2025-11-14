import mongoose from 'mongoose';

const donorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    description: 'Name of the donor (can be "Donador Anónimo" for anonymous)'
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
    description: 'Donation amount in USD'
  },
  currency: {
    type: String,
    default: 'USD',
    enum: ['USD', 'UYU', 'EUR'],
    description: 'Currency of the donation'
  },
  date: {
    type: String,
    required: true,
    description: 'Display date (e.g., "Enero 2025", "Diciembre 2024")'
  },
  message: {
    type: String,
    default: '',
    maxlength: 200,
    description: 'Optional message from the donor'
  },
  tier: {
    type: String,
    enum: ['platinum', 'gold', 'silver', 'bronze'],
    default: 'bronze',
    description: 'Donor tier based on amount: platinum ($100+), gold ($51-99), silver ($11-50), bronze ($1-10)'
  },
  isAnonymous: {
    type: Boolean,
    default: false,
    description: 'Whether this is an anonymous donation'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    description: 'When the donor was added to the system'
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    description: 'Last update timestamp'
  }
}, {
  timestamps: true
});

// Pre-validate middleware to automatically set tier based on amount
donorSchema.pre('validate', function(next) {
  const amount = this.amount;

  if (amount >= 100) {
    this.tier = 'platinum';
  } else if (amount >= 51) {
    this.tier = 'gold';
  } else if (amount >= 11) {
    this.tier = 'silver';
  } else {
    this.tier = 'bronze';
  }

  next();
});

// Static method to get all donors sorted by amount (highest first)
donorSchema.statics.getAllDonors = async function() {
  return this.find()
    .sort({ amount: -1, createdAt: -1 })
    .lean();
};

// Static method to get donors by tier
donorSchema.statics.getDonorsByTier = async function(tier) {
  return this.find({ tier })
    .sort({ amount: -1, createdAt: -1 })
    .lean();
};

// Instance method to get badge info
donorSchema.methods.getBadgeInfo = function() {
  const badges = {
    platinum: { icon: '💎', label: 'Platino' },
    gold: { icon: '⭐⭐⭐', label: 'Oro' },
    silver: { icon: '⭐⭐', label: 'Plata' },
    bronze: { icon: '⭐', label: 'Bronce' }
  };

  return badges[this.tier] || badges.bronze;
};

const Donor = mongoose.model('Donor', donorSchema);

export default Donor;
