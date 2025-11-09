import mongoose from 'mongoose';
import crypto from 'crypto';

const apiTokenSchema = new mongoose.Schema({
  // Secure random token
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // User who owns this token (admin who created it)
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },

  // Friendly name for the token
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  // Description/notes about this token
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },

  // Permissions granted to this token
  permissions: [{
    type: String,
    enum: ['read', 'write', 'admin', 'incidents', 'forum', 'reports', 'all']
  }],

  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },

  lastUsed: {
    type: Date,
    default: null
  },

  expiresAt: {
    type: Date,
    default: null // null = never expires
  },

  // Revocation
  isRevoked: {
    type: Boolean,
    default: false
  },

  revokedAt: {
    type: Date,
    default: null
  },

  revokedBy: {
    type: String,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

// Index for quick lookups
apiTokenSchema.index({ token: 1, isRevoked: 1 });
apiTokenSchema.index({ userId: 1 });
apiTokenSchema.index({ createdAt: -1 });

/**
 * Generate a secure random API token
 * @param {number} bytes - Number of random bytes (default 32)
 * @returns {string} Hex-encoded token
 */
apiTokenSchema.statics.generateToken = function(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Create a new API token
 * @param {Object} data - Token data
 * @returns {Promise<ApiToken>}
 */
apiTokenSchema.statics.createToken = async function(data) {
  const token = this.generateToken(data.tokenBytes || 32);

  return this.create({
    token,
    userId: data.userId,
    name: data.name,
    description: data.description || '',
    permissions: data.permissions || ['all'],
    expiresAt: data.expiresAt || null
  });
};

/**
 * Verify a token and return the token document if valid
 * @param {string} tokenString - The token to verify
 * @returns {Promise<ApiToken|null>}
 */
apiTokenSchema.statics.verifyToken = async function(tokenString) {
  if (!tokenString) return null;

  const token = await this.findOne({
    token: tokenString,
    isRevoked: false
  });

  if (!token) return null;

  // Check if expired
  if (token.expiresAt && token.expiresAt < new Date()) {
    return null;
  }

  // Update last used
  token.lastUsed = new Date();
  await token.save();

  return token;
};

/**
 * Revoke a token
 * @param {string} tokenId - Token ID to revoke
 * @param {string} revokedBy - User ID who revoked it
 * @returns {Promise<ApiToken>}
 */
apiTokenSchema.methods.revoke = async function(revokedBy) {
  this.isRevoked = true;
  this.revokedAt = new Date();
  this.revokedBy = revokedBy;
  return this.save();
};

/**
 * Check if token has a specific permission
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
apiTokenSchema.methods.hasPermission = function(permission) {
  if (this.permissions.includes('all')) return true;
  return this.permissions.includes(permission);
};

const ApiToken = mongoose.model('ApiToken', apiTokenSchema);

export default ApiToken;
