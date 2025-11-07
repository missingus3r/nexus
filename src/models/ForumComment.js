import mongoose from 'mongoose';

const forumCommentSchema = new mongoose.Schema({
  threadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumThread',
    required: true,
    index: true
  },
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ForumComment',
    default: null,
    index: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 5000
  },
  mentions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    username: String,
    mentionedAt: {
      type: Date,
      default: Date.now
    }
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  images: [{
    url: String,
    filename: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  likes: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  likesCount: {
    type: Number,
    default: 0,
    index: true
  },
  depth: {
    type: Number,
    default: 0,
    min: 0,
    max: 5 // Maximum nesting level
  },
  repliesCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'deleted', 'hidden'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
forumCommentSchema.index({ threadId: 1, createdAt: -1 });
forumCommentSchema.index({ threadId: 1, parentCommentId: 1 });
forumCommentSchema.index({ author: 1, createdAt: -1 });
forumCommentSchema.index({ status: 1 });

// Method to toggle like
forumCommentSchema.methods.toggleLike = function(userId) {
  const likeIndex = this.likes.findIndex(like =>
    like.userId.toString() === userId.toString()
  );

  if (likeIndex > -1) {
    // Unlike
    this.likes.splice(likeIndex, 1);
    this.likesCount = Math.max(0, this.likesCount - 1);
    return false;
  } else {
    // Like
    this.likes.push({ userId });
    this.likesCount += 1;
    return true;
  }
};

// Method to check if user has liked
forumCommentSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like =>
    like.userId.toString() === userId.toString()
  );
};

const ForumComment = mongoose.model('ForumComment', forumCommentSchema);

export default ForumComment;
