import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    index: true,
    description: 'User ID who receives this notification'
  },
  type: {
    type: String,
    required: true,
    enum: [
      'new_incident',      // New incident in area
      'incident_validated', // Someone validated your incident
      'validation_reward',  // You got reputation from validation
      'news',              // New news event
      'admin_post'         // Admin announcement
    ],
    index: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    description: 'Additional data (incidentId, newsId, postId, etc.)'
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ uid: 1, read: 1, createdAt: -1 });
notificationSchema.index({ uid: 1, type: 1, createdAt: -1 });

// Methods
notificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.readAt = new Date();
  return this.save();
};

// Statics
notificationSchema.statics.createNotification = async function(uid, type, title, message, data = {}) {
  const notification = new this({
    uid,
    type,
    title,
    message,
    data
  });
  await notification.save();
  return notification;
};

notificationSchema.statics.markAllAsRead = async function(uid) {
  return this.updateMany(
    { uid, read: false },
    { read: true, readAt: new Date() }
  );
};

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
