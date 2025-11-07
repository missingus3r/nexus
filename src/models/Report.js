import mongoose from 'mongoose';

// Razones predefinidas para reportes
export const REPORT_REASONS = [
  'spam',
  'harassment',
  'inappropriate_content',
  'hate_speech',
  'misinformation',
  'violence',
  'other'
];

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reportedType: {
    type: String,
    enum: ['thread', 'comment', 'user'],
    required: true,
    index: true
  },
  reportedId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  reportedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: REPORT_REASONS,
    required: true,
    index: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'rejected'],
    default: 'pending',
    index: true
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  resolution: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  // Metadata del contenido reportado (para referencia rápida)
  contentSnapshot: {
    title: String,
    content: String,
    author: String
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ reportedUserId: 1, status: 1 });
reportSchema.index({ reportedType: 1, reportedId: 1 });

// Prevent duplicate reports from the same user for the same content
reportSchema.index(
  { reporter: 1, reportedType: 1, reportedId: 1 },
  { unique: true }
);

// Method to mark as reviewed
reportSchema.methods.markAsReviewed = function(adminId, resolution) {
  this.status = 'reviewed';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  if (resolution) {
    this.resolution = resolution;
  }
};

// Method to resolve
reportSchema.methods.resolve = function(adminId, resolution) {
  this.status = 'resolved';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.resolution = resolution;
};

// Method to reject
reportSchema.methods.reject = function(adminId, resolution) {
  this.status = 'rejected';
  this.reviewedBy = adminId;
  this.reviewedAt = new Date();
  this.resolution = resolution;
};

const Report = mongoose.model('Report', reportSchema);

export default Report;
