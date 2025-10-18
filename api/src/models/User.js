import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Auth0 subject ID'
  },
  reputacion: {
    type: Number,
    default: 50,
    min: 0,
    max: 100,
    description: 'User reputation score (0-100)'
  },
  reportCount: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Number of incidents reported by user'
  },
  validationCount: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Number of validations performed by user'
  },
  strikes: {
    type: Number,
    default: 0,
    min: 0,
    description: 'Number of moderation strikes'
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'admin'],
    default: 'user'
  },
  banned: {
    type: Boolean,
    default: false
  },
  bannedUntil: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Methods
userSchema.methods.updateReputation = function(delta) {
  this.reputacion = Math.max(0, Math.min(100, this.reputacion + delta));
  return this.save();
};

userSchema.methods.incrementReportCount = function() {
  this.reportCount += 1;
  return this.save();
};

userSchema.methods.incrementValidationCount = function() {
  this.validationCount += 1;
  return this.save();
};

userSchema.methods.addStrike = function() {
  this.strikes += 1;
  if (this.strikes >= 3) {
    this.banned = true;
    this.bannedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  }
  return this.save();
};

userSchema.methods.isBanned = function() {
  if (!this.banned) return false;
  if (this.bannedUntil && this.bannedUntil < new Date()) {
    this.banned = false;
    this.bannedUntil = null;
    this.save();
    return false;
  }
  return true;
};

const User = mongoose.model('User', userSchema);

export default User;
