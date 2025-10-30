import mongoose from 'mongoose';

const adminPostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    maxlength: 200,
    trim: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 2000,
    trim: true
  },
  authorUid: {
    type: String,
    required: true,
    description: 'Admin user ID who created the post'
  },
  priority: {
    type: String,
    enum: ['normal', 'important', 'urgent'],
    default: 'normal',
    description: 'Post priority level'
  },
  published: {
    type: Boolean,
    default: true,
    description: 'Whether the post is visible to users'
  },
  likes: [{
    uid: String,
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: [{
    uid: String,
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
adminPostSchema.index({ published: 1, createdAt: -1 });
adminPostSchema.index({ priority: 1, createdAt: -1 });

// Virtual fields
adminPostSchema.virtual('likeCount').get(function() {
  return this.likes.length;
});

adminPostSchema.virtual('viewCount').get(function() {
  return this.views.length;
});

// Methods
adminPostSchema.methods.addLike = function(uid) {
  // Check if user already liked
  const alreadyLiked = this.likes.some(like => like.uid === uid);
  if (alreadyLiked) {
    // Unlike
    this.likes = this.likes.filter(like => like.uid !== uid);
  } else {
    // Like
    this.likes.push({ uid, likedAt: new Date() });
  }
  return this.save();
};

adminPostSchema.methods.addView = function(uid) {
  // Check if user already viewed
  const alreadyViewed = this.views.some(view => view.uid === uid);
  if (!alreadyViewed) {
    this.views.push({ uid, viewedAt: new Date() });
    return this.save();
  }
  return Promise.resolve(this);
};

adminPostSchema.methods.hasLiked = function(uid) {
  return this.likes.some(like => like.uid === uid);
};

adminPostSchema.methods.hasViewed = function(uid) {
  return this.views.some(view => view.uid === uid);
};

// Transform toJSON to include virtuals
adminPostSchema.set('toJSON', { virtuals: true });
adminPostSchema.set('toObject', { virtuals: true });

const AdminPost = mongoose.model('AdminPost', adminPostSchema);

export default AdminPost;
