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
  type: {
    type: String,
    enum: ['discussion', 'poll'],
    default: 'discussion',
    index: true
  },
  // Poll-specific fields
  poll: {
    question: {
      type: String,
      trim: true,
      maxlength: 500
    },
    options: [{
      id: String,
      text: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
      },
      votes: [{
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        votedAt: {
          type: Date,
          default: Date.now
        }
      }],
      votesCount: {
        type: Number,
        default: 0
      }
    }],
    expiresAt: {
      type: Date
    },
    allowMultiple: {
      type: Boolean,
      default: false
    },
    totalVotes: {
      type: Number,
      default: 0
    }
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

// Method to vote in a poll
forumThreadSchema.methods.vote = function(userId, optionIds) {
  if (this.type !== 'poll' || !this.poll) {
    throw new Error('This thread is not a poll');
  }

  // Check if poll has expired
  if (this.poll.expiresAt && new Date() > this.poll.expiresAt) {
    throw new Error('This poll has expired');
  }

  // Ensure optionIds is an array
  const selectedOptions = Array.isArray(optionIds) ? optionIds : [optionIds];

  // Check if multiple votes are allowed
  if (!this.poll.allowMultiple && selectedOptions.length > 1) {
    throw new Error('Multiple votes are not allowed for this poll');
  }

  // Remove user's previous votes if not allowing multiple
  if (!this.poll.allowMultiple) {
    this.poll.options.forEach(option => {
      const voteIndex = option.votes.findIndex(vote =>
        vote.userId.toString() === userId.toString()
      );
      if (voteIndex > -1) {
        option.votes.splice(voteIndex, 1);
        option.votesCount = Math.max(0, option.votesCount - 1);
      }
    });
  }

  // Add new votes
  let votesAdded = 0;
  selectedOptions.forEach(optionId => {
    const option = this.poll.options.find(opt => opt.id === optionId);
    if (option) {
      // Check if user already voted for this option
      const alreadyVoted = option.votes.some(vote =>
        vote.userId.toString() === userId.toString()
      );

      if (!alreadyVoted) {
        option.votes.push({ userId });
        option.votesCount += 1;
        votesAdded += 1;
      }
    }
  });

  // Recalculate total votes
  this.poll.totalVotes = this.poll.options.reduce((sum, opt) => sum + opt.votesCount, 0);

  return votesAdded > 0;
};

// Method to check if user has voted in a poll
forumThreadSchema.methods.hasUserVoted = function(userId) {
  if (this.type !== 'poll' || !this.poll) {
    return false;
  }

  return this.poll.options.some(option =>
    option.votes.some(vote => vote.userId.toString() === userId.toString())
  );
};

// Method to get user's votes in a poll
forumThreadSchema.methods.getUserVotes = function(userId) {
  if (this.type !== 'poll' || !this.poll) {
    return [];
  }

  const userVotes = [];
  this.poll.options.forEach(option => {
    const hasVoted = option.votes.some(vote =>
      vote.userId.toString() === userId.toString()
    );
    if (hasVoted) {
      userVotes.push(option.id);
    }
  });

  return userVotes;
};

const ForumThread = mongoose.model('ForumThread', forumThreadSchema);

export default ForumThread;
