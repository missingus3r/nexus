import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    default: 'Usuario'
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const commentSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    trim: true
  },
  username: {
    type: String,
    default: 'Usuario'
  },
  body: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  replies: {
    type: [replySchema],
    default: []
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const surlinkListingSchema = new mongoose.Schema({
  category: {
    type: String,
    enum: ['casas', 'autos', 'academy'],
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  subtitle: {
    type: String,
    trim: true
  },
  summary: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    amount: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true
    },
    frequency: {
      type: String,
      trim: true,
      enum: ['one-time', 'monthly', 'annual', 'weekly', 'seasonal', 'negotiable', '']
    }
  },
  location: {
    country: {
      type: String,
      trim: true
    },
    state: {
      type: String,
      trim: true
    },
    city: {
      type: String,
      trim: true
    },
    neighborhood: {
      type: String,
      trim: true
    },
    address: {
      type: String,
      trim: true
    },
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        validate: {
          validator: function(coords) {
            return !coords || coords.length === 2;
          },
          message: 'Las coordenadas deben incluir [longitud, latitud]'
        }
      }
    }
  },
  tags: {
    type: [String],
    default: []
  },
  attributes: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  programs: {
    type: [String],
    default: []
  },
  contact: {
    phone: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true
    },
    whatsapp: {
      type: String,
      trim: true
    },
    website: {
      type: String,
      trim: true
    }
  },
  media: {
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  source: {
    type: String,
    default: 'manual',
    trim: true
  },
  createdBy: {
    type: String,
    default: 'admin',
    trim: true
  },
  expiresAt: {
    type: Date
  },
  likedBy: {
    type: [String],
    default: []
  },
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    saves: {
      type: Number,
      default: 0
    }
  },
  comments: {
    type: [commentSchema],
    default: []
  }
}, {
  timestamps: true,
  toObject: {
    virtuals: true,
    versionKey: false
  },
  toJSON: {
    virtuals: true,
    versionKey: false
  }
});

surlinkListingSchema.index({ 'location.coordinates': '2dsphere' });
surlinkListingSchema.index({
  title: 'text',
  summary: 'text',
  description: 'text',
  tags: 'text'
});

surlinkListingSchema.methods.toggleLike = function(uid) {
  if (!uid) return this;

  const index = this.likedBy.indexOf(uid);

  if (index === -1) {
    this.likedBy.push(uid);
  } else {
    this.likedBy.splice(index, 1);
  }

  this.metrics.likes = this.likedBy.length;
  return this;
};

surlinkListingSchema.methods.addComment = function(uid, username, body) {
  this.comments.push({
    uid,
    username,
    body,
    replies: []
  });
  return this;
};

surlinkListingSchema.methods.addReply = function(commentId, uid, username, body) {
  const comment = this.comments.id(commentId);
  if (!comment) {
    throw new Error('Comentario no encontrado');
  }
  comment.replies.push({
    uid,
    username,
    body
  });
  return this;
};

surlinkListingSchema.pre('save', function(next) {
  this.metrics.likes = this.likedBy.length;
  next();
});

const SurlinkListing = mongoose.model('SurlinkListing', surlinkListingSchema);

export default SurlinkListing;
