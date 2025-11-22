import mongoose from 'mongoose';

const cvDocumentSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  personalInfo: {
    fullName: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    location: {
      type: String,
      default: ''
    },
    linkedin: {
      type: String,
      default: ''
    },
    portfolio: {
      type: String,
      default: ''
    }
  },
  professionalSummary: {
    type: String,
    default: ''
  },
  experience: [{
    title: {
      type: String,
      required: true
    },
    company: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    current: {
      type: Boolean,
      default: false
    },
    description: {
      type: String,
      default: ''
    }
  }],
  education: [{
    degree: {
      type: String,
      required: true
    },
    institution: {
      type: String,
      required: true
    },
    startDate: {
      type: Date,
      default: null
    },
    endDate: {
      type: Date,
      default: null
    },
    description: {
      type: String,
      default: ''
    }
  }],
  skills: [{
    type: String
  }],
  languages: [{
    name: {
      type: String,
      required: true
    },
    level: {
      type: String,
      enum: ['basic', 'intermediate', 'advanced', 'native'],
      required: true
    }
  }],
  questionsAnswers: {
    currentRole: {
      type: String,
      default: ''
    },
    topSkills: {
      type: String,
      default: ''
    },
    targetPosition: {
      type: String,
      default: ''
    },
    achievements: {
      type: String,
      default: ''
    },
    education: {
      type: String,
      default: ''
    },
    additional: {
      type: String,
      default: ''
    }
  },
  generatedContent: {
    type: String,
    default: ''
  },
  lastGenerated: {
    type: Date,
    default: null
  },
  versions: [{
    content: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  generationCount: {
    type: Number,
    default: 0
  },
  lastGenerationDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Method to check if user can generate CV
// Free users: 1 per week
// Premium users: 3 per day
// Users with purchased generations: use purchased first
cvDocumentSchema.methods.canGenerate = function(user) {
  // Check if user has purchased generations
  if (user.cvGenerations && user.cvGenerations.purchased > 0) {
    return { allowed: true, source: 'purchased', remaining: user.cvGenerations.purchased };
  }

  const now = new Date();
  const isPremium = user.subscription && user.subscription.isPremium &&
                    user.subscription.endDate && new Date(user.subscription.endDate) > now;

  if (!this.lastGenerationDate) {
    return { allowed: true, source: isPremium ? 'premium' : 'free', remaining: isPremium ? 3 : 1 };
  }

  if (isPremium) {
    // Premium: 3 per day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lastGen = new Date(this.lastGenerationDate);
    lastGen.setHours(0, 0, 0, 0);

    if (today.getTime() === lastGen.getTime()) {
      const remaining = 3 - this.generationCount;
      return {
        allowed: this.generationCount < 3,
        source: 'premium',
        remaining: Math.max(0, remaining)
      };
    }

    return { allowed: true, source: 'premium', remaining: 3 };
  } else {
    // Free: 1 per week
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastGen = new Date(this.lastGenerationDate);

    const allowed = lastGen < oneWeekAgo;
    return {
      allowed,
      source: 'free',
      remaining: allowed ? 1 : 0,
      nextAvailable: allowed ? null : new Date(lastGen.getTime() + 7 * 24 * 60 * 60 * 1000)
    };
  }
};

// Method to increment generation count
cvDocumentSchema.methods.incrementGeneration = function(user, source = 'free') {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastGen = this.lastGenerationDate ? new Date(this.lastGenerationDate) : null;
  if (lastGen) {
    lastGen.setHours(0, 0, 0, 0);
  }

  // If using purchased generation, decrement purchased count
  if (source === 'purchased' && user.cvGenerations && user.cvGenerations.purchased > 0) {
    user.cvGenerations.purchased -= 1;
    // Don't increment daily count for purchased generations
  } else {
    // Regular generation (free or premium)
    if (lastGen && today.getTime() === lastGen.getTime()) {
      this.generationCount += 1;
    } else {
      this.generationCount = 1;
      this.lastGenerationDate = new Date();
    }
  }

  this.lastGenerated = new Date();
};

const CVDocument = mongoose.model('CVDocument', cvDocumentSchema);

export default CVDocument;
