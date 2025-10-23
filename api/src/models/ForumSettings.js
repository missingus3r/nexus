import mongoose from 'mongoose';

const forumSettingsSchema = new mongoose.Schema({
  // Rate limiting settings
  postCooldownMinutes: {
    type: Number,
    default: 30,
    min: 0,
    max: 1440 // Max 24 hours
  },
  maxCommentsPerDay: {
    type: Number,
    default: 100,
    min: 1,
    max: 1000
  },

  // Feature flags
  allowImages: {
    type: Boolean,
    default: true
  },
  allowLinks: {
    type: Boolean,
    default: true
  },

  // Content limits
  maxThreadTitleLength: {
    type: Number,
    default: 200
  },
  maxThreadContentLength: {
    type: Number,
    default: 10000
  },
  maxCommentLength: {
    type: Number,
    default: 5000
  },
  maxImagesPerPost: {
    type: Number,
    default: 5,
    min: 0,
    max: 10
  },

  // Singleton pattern - only one settings document
  _id: {
    type: String,
    default: 'forum_settings'
  }
}, {
  timestamps: true
});

// Static method to get or create settings
forumSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findById('forum_settings');
  if (!settings) {
    settings = await this.create({ _id: 'forum_settings' });
  }
  return settings;
};

// Static method to update settings
forumSettingsSchema.statics.updateSettings = async function(updates) {
  let settings = await this.findById('forum_settings');
  if (!settings) {
    settings = await this.create({ _id: 'forum_settings', ...updates });
  } else {
    Object.assign(settings, updates);
    await settings.save();
  }
  return settings;
};

const ForumSettings = mongoose.model('ForumSettings', forumSettingsSchema);

export default ForumSettings;
