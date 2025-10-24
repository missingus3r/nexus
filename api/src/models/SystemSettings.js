import mongoose from 'mongoose';

const systemSettingsSchema = new mongoose.Schema({
  // Singleton pattern - only one document
  _id: {
    type: String,
    default: 'system-settings'
  },

  // Maintenance modes for each platform
  maintenanceMode: {
    surlink: {
      type: Boolean,
      default: false,
      description: 'Enable maintenance mode for Surlink platform'
    },
    centinel: {
      type: Boolean,
      default: false,
      description: 'Enable maintenance mode for Centinel (main map)'
    },
    forum: {
      type: Boolean,
      default: false,
      description: 'Enable maintenance mode for Forum'
    },
    auth: {
      type: Boolean,
      default: false,
      description: 'Disable login/registration (enables admin-only Auth0 login)'
    }
  },

  // Maintenance messages (optional custom messages)
  maintenanceMessages: {
    surlink: {
      type: String,
      default: 'Surlink está en mantenimiento. Volveremos pronto.'
    },
    centinel: {
      type: String,
      default: 'El mapa de Centinel está en mantenimiento. Volveremos pronto.'
    },
    forum: {
      type: String,
      default: 'El foro está en mantenimiento. Volveremos pronto.'
    },
    auth: {
      type: String,
      default: 'El sistema de autenticación está en mantenimiento. Solo administradores pueden acceder.'
    }
  },

  updatedAt: {
    type: Date,
    default: Date.now
  },

  updatedBy: {
    type: String,
    default: null,
    description: 'Email or ID of admin who last updated settings'
  }
}, {
  timestamps: true
});

// Static method to get settings (creates if doesn't exist)
systemSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findById('system-settings');

  if (!settings) {
    settings = await this.create({ _id: 'system-settings' });
  }

  return settings;
};

// Static method to update settings
systemSettingsSchema.statics.updateSettings = async function(updates, updatedBy = null) {
  const settings = await this.getSettings();

  if (updates.maintenanceMode) {
    Object.assign(settings.maintenanceMode, updates.maintenanceMode);
  }

  if (updates.maintenanceMessages) {
    Object.assign(settings.maintenanceMessages, updates.maintenanceMessages);
  }

  settings.updatedBy = updatedBy;
  settings.updatedAt = new Date();

  await settings.save();
  return settings;
};

// Method to check if a specific platform is in maintenance
systemSettingsSchema.methods.isInMaintenance = function(platform) {
  return this.maintenanceMode[platform] || false;
};

const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default SystemSettings;
