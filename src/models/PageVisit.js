import mongoose from 'mongoose';

const pageVisitSchema = new mongoose.Schema({
  page: {
    type: String,
    required: true,
    index: true,
    description: 'URL path of the visited page'
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
    description: 'User ID if logged in, null for anonymous'
  },
  userEmail: {
    type: String,
    default: null,
    description: 'User email if logged in'
  },
  ipAddress: {
    type: String,
    default: null,
    description: 'IP address of visitor (for anonymous users)'
  },
  userAgent: {
    type: String,
    default: null,
    description: 'Browser user agent string'
  },
  referer: {
    type: String,
    default: null,
    description: 'Referring page URL'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
    description: 'When the page was visited'
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
pageVisitSchema.index({ page: 1, timestamp: -1 });
pageVisitSchema.index({ userId: 1, timestamp: -1 });
pageVisitSchema.index({ ipAddress: 1, timestamp: -1 });

// Static method to get visit stats by page
pageVisitSchema.statics.getStatsByPage = async function(page, startDate, endDate) {
  const query = { page };

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const total = await this.countDocuments(query);
  const authenticated = await this.countDocuments({ ...query, userId: { $ne: null } });
  const anonymous = await this.countDocuments({ ...query, userId: null });

  return {
    page,
    total,
    authenticated,
    anonymous
  };
};

// Static method to get overall stats
pageVisitSchema.statics.getOverallStats = async function(startDate, endDate) {
  const query = {};

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const total = await this.countDocuments(query);
  const authenticated = await this.countDocuments({ ...query, userId: { $ne: null } });
  const anonymous = await this.countDocuments({ ...query, userId: null });

  // Get unique visitors (by userId or IP)
  const uniqueUsers = await this.distinct('userId', { ...query, userId: { $ne: null } });
  const uniqueIPs = await this.distinct('ipAddress', { ...query, userId: null });

  // Get top pages
  const topPages = await this.aggregate([
    { $match: query },
    { $group: { _id: '$page', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 }
  ]);

  return {
    total,
    authenticated,
    anonymous,
    uniqueAuthenticatedUsers: uniqueUsers.length,
    uniqueAnonymousIPs: uniqueIPs.length,
    topPages: topPages.map(p => ({ page: p._id, visits: p.count }))
  };
};

// Static method to get visits by user
pageVisitSchema.statics.getVisitsByUser = async function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .select('page timestamp userAgent');
};

// Static method to get recent visits
pageVisitSchema.statics.getRecentVisits = async function(limit = 100) {
  return this.find()
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'email name')
    .select('page userId userEmail ipAddress timestamp');
};

const PageVisit = mongoose.model('PageVisit', pageVisitSchema);

export default PageVisit;
