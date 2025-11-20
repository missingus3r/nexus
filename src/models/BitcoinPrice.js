import mongoose from 'mongoose';

/**
 * BitcoinPrice Model
 * Stores Bitcoin price data from CoinGecko API
 * Singleton pattern with fixed _id
 */
const bitcoinPriceSchema = new mongoose.Schema({
  _id: { type: String, default: 'bitcoin_price' },

  // Bitcoin price data
  price: {
    type: Number,
    default: 0,
    description: 'Current Bitcoin price in USD'
  },
  previousPrice: {
    type: Number,
    default: 0,
    description: 'Previous Bitcoin price for comparison'
  },
  change24h: {
    type: Number,
    default: 0,
    description: 'Percentage change in last 24 hours from CoinGecko'
  },

  // Metadata
  lastSuccessfulUpdate: {
    type: Date,
    default: null,
    description: 'Timestamp of last successful sync from CoinGecko'
  },
  lastSyncAttempt: {
    type: Date,
    default: null,
    description: 'Timestamp of last sync attempt (success or failure)'
  },
  hasError: {
    type: Boolean,
    default: false,
    description: 'Flag indicating if last sync failed'
  },
  errorMessage: {
    type: String,
    default: '',
    description: 'Error message from last failed sync'
  },

  updatedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

/**
 * Static method to get settings (create if not exists)
 */
bitcoinPriceSchema.statics.getSettings = async function() {
  let settings = await this.findById('bitcoin_price');
  if (!settings) {
    settings = await this.create({ _id: 'bitcoin_price' });
  }
  return settings;
};

/**
 * Static method to update Bitcoin price
 * @param {Object} data - Object containing price and change24h
 * @param {Boolean} success - Whether the update was successful
 * @param {String} errorMessage - Error message if update failed
 */
bitcoinPriceSchema.statics.updatePrice = async function(data, success = true, errorMessage = '') {
  const settings = await this.getSettings();

  if (success && data) {
    // Store previous price before updating
    if (settings.price > 0) {
      settings.previousPrice = settings.price;
    }

    // Update with new data
    settings.price = data.price || 0;
    settings.change24h = data.change24h || 0;
    settings.lastSuccessfulUpdate = new Date();
    settings.hasError = false;
    settings.errorMessage = '';
  } else {
    // Update failed
    settings.hasError = true;
    settings.errorMessage = errorMessage;
  }

  settings.lastSyncAttempt = new Date();
  settings.updatedAt = new Date();
  await settings.save();

  return settings;
};

/**
 * Instance method to get Bitcoin data in a friendly format
 */
bitcoinPriceSchema.methods.getBitcoinData = function() {
  return {
    price: this.price,
    change24h: this.change24h,
    lastUpdate: this.lastSuccessfulUpdate,
    hasError: this.hasError,
    errorMessage: this.errorMessage
  };
};

const BitcoinPrice = mongoose.model('BitcoinPrice', bitcoinPriceSchema);

export default BitcoinPrice;
