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

// Method to check if user can generate CV (max 5 per day)
cvDocumentSchema.methods.canGenerate = function() {
  if (!this.lastGenerationDate) return true;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastGen = new Date(this.lastGenerationDate);
  lastGen.setHours(0, 0, 0, 0);

  if (today.getTime() === lastGen.getTime()) {
    return this.generationCount < 5;
  }

  return true;
};

// Method to increment generation count
cvDocumentSchema.methods.incrementGeneration = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastGen = this.lastGenerationDate ? new Date(this.lastGenerationDate) : null;
  if (lastGen) {
    lastGen.setHours(0, 0, 0, 0);
  }

  if (lastGen && today.getTime() === lastGen.getTime()) {
    this.generationCount += 1;
  } else {
    this.generationCount = 1;
    this.lastGenerationDate = new Date();
  }

  this.lastGenerated = new Date();
};

const CVDocument = mongoose.model('CVDocument', cvDocumentSchema);

export default CVDocument;
