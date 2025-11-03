import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const siteCommentSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    index: true
  },
  siteType: {
    type: String,
    required: true,
    enum: ['academy', 'financial', 'construccion']
  },
  username: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  replies: [replySchema],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
siteCommentSchema.index({ siteId: 1, createdAt: -1 });

// Update the updatedAt timestamp before saving
siteCommentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const SiteComment = mongoose.model('SiteComment', siteCommentSchema);

export default SiteComment;
