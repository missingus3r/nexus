import mongoose from 'mongoose';

// Hashtags predefinidos permitidos
export const ALLOWED_HASHTAGS = [
  'centinel',
  'surlink',
  'seguridad',
  'inmuebles',
  'autos',
  'educacion',
  'finanzas',
  'transporte',
  'tecnologia',
  'comunidad',
  'ayuda',
  'sugerencia',
  'bug',
  'pregunta',
  'discusion'
];

const forumThreadSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 10000
  },
  hashtags: [{
    type: String,
    enum: ALLOWED_HASHTAGS,
    lowercase: true
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
  links: [{
    type: String,
    trim: true
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
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0,
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'deleted', 'hidden'],
    default: 'active'
  },
  isPinned: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
forumThreadSchema.index({ createdAt: -1 });
forumThreadSchema.index({ likesCount: -1 });
forumThreadSchema.index({ status: 1, createdAt: -1 });
forumThreadSchema.index({ author: 1, createdAt: -1 });
forumThreadSchema.index({ hashtags: 1 });

// Virtual for like status
forumThreadSchema.virtual('isLiked').get(function() {
  return false; // Will be populated dynamically on frontend
});

// Method to toggle like
forumThreadSchema.methods.toggleLike = function(userId) {
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
forumThreadSchema.methods.isLikedBy = function(userId) {
  return this.likes.some(like =>
    like.userId.toString() === userId.toString()
  );
};

const ForumThread = mongoose.model('ForumThread', forumThreadSchema);

export default ForumThread;
