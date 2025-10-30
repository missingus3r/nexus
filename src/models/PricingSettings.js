import mongoose from 'mongoose';

const pricingSettingsSchema = new mongoose.Schema({
  _id: { type: String, default: 'pricing_settings' },

  // Exchange rate
  usdToUyu: {
    type: Number,
    default: 44,
    min: 1,
    description: 'USD to UYU exchange rate'
  },

  // Personal plans
  premiumMonthly: { type: Number, default: 2, min: 0 },
  premiumYearly: { type: Number, default: 22, min: 0 }, // 2 * 12 * 0.9 (10% discount)

  proMonthly: { type: Number, default: 5, min: 0 },
  proYearly: { type: Number, default: 54, min: 0 }, // 5 * 12 * 0.9

  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Static method to get settings (create if not exists)
pricingSettingsSchema.statics.getSettings = async function() {
  let settings = await this.findById('pricing_settings');
  if (!settings) {
    settings = await this.create({ _id: 'pricing_settings' });
  }
  return settings;
};

// Static method to update settings
pricingSettingsSchema.statics.updateSettings = async function(updates) {
  const settings = await this.getSettings();
  Object.assign(settings, updates);
  settings.updatedAt = new Date();
  await settings.save();
  return settings;
};

const PricingSettings = mongoose.model('PricingSettings', pricingSettingsSchema);

export default PricingSettings;
