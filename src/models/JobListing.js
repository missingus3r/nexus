import mongoose from 'mongoose';

const jobListingSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 100
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  companyLogo: {
    type: String,
    default: null
  },
  description: {
    type: String,
    required: true,
    minlength: 50,
    maxlength: 5000
  },
  summary: {
    type: String,
    maxlength: 200
  },
  location: {
    city: {
      type: String,
      default: ''
    },
    neighborhood: {
      type: String,
      default: ''
    },
    remote: {
      type: Boolean,
      default: false
    },
    hybrid: {
      type: Boolean,
      default: false
    }
  },
  jobType: {
    type: String,
    enum: ['full-time', 'part-time', 'freelance', 'internship', 'contract'],
    required: true
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'executive'],
    required: true
  },
  salary: {
    min: {
      type: Number,
      default: null
    },
    max: {
      type: Number,
      default: null
    },
    currency: {
      type: String,
      default: 'UYU'
    },
    frequency: {
      type: String,
      enum: ['monthly', 'hourly', 'annual'],
      default: 'monthly'
    }
  },
  benefits: [{
    type: String
  }],
  requirements: [{
    type: String
  }],
  responsibilities: [{
    type: String
  }],
  tags: [{
    type: String
  }],
  contact: {
    email: {
      type: String,
      default: null
    },
    phone: {
      type: String,
      default: null
    },
    applyUrl: {
      type: String,
      default: null
    },
    whatsapp: {
      type: String,
      default: null
    }
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active'
  },
  expiresAt: {
    type: Date,
    default: null
  },
  postedBy: {
    type: String,
    required: true,
    index: true
  },
  likedBy: [{
    type: String
  }],
  metrics: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    applications: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes
jobListingSchema.index({ status: 1, createdAt: -1 });
jobListingSchema.index({ 'location.city': 1 });
jobListingSchema.index({ tags: 1 });
jobListingSchema.index({ jobType: 1 });
jobListingSchema.index({ experienceLevel: 1 });
jobListingSchema.index({ postedBy: 1 });
jobListingSchema.index({ likedBy: 1 });

// Text search index
jobListingSchema.index({
  title: 'text',
  description: 'text',
  company: 'text',
  tags: 'text'
});

const JobListing = mongoose.model('JobListing', jobListingSchema);

export default JobListing;
