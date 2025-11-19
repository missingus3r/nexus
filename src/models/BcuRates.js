import mongoose from 'mongoose';

/**
 * Schema for individual currency rate
 */
const currencyRateSchema = new mongoose.Schema({
  venta: { type: Number, default: 0 },
  compra: { type: Number, default: 0 },
  arbitraje: { type: Number, default: 0 },
  previousVenta: { type: Number, default: 0 },
  change24h: { type: Number, default: 0 }, // Percentage change
  fecha: { type: String, default: '' }
}, { _id: false });

/**
 * BcuRates Model
 * Stores exchange rates from Banco Central del Uruguay
 * Singleton pattern with fixed _id
 */
const bcuRatesSchema = new mongoose.Schema({
  _id: { type: String, default: 'bcu_rates' },

  // Exchange rates
  usdBillete: {
    type: currencyRateSchema,
    default: () => ({}),
    description: 'DLS. USA BILLETE'
  },
  usdCable: {
    type: currencyRateSchema,
    default: () => ({}),
    description: 'DLS. USA CABLE'
  },
  usdPromedio: {
    type: currencyRateSchema,
    default: () => ({}),
    description: 'DLS.PROMED.FONDO'
  },
  ars: {
    type: currencyRateSchema,
    default: () => ({}),
    description: 'PESO ARG.BILLETE'
  },
  brl: {
    type: currencyRateSchema,
    default: () => ({}),
    description: 'REAL BILLETE'
  },
  ui: {
    type: currencyRateSchema,
    default: () => ({}),
    description: 'UNIDAD INDEXADA'
  },
  up: {
    type: currencyRateSchema,
    default: () => ({}),
    description: 'UNIDAD PREVISIONAL'
  },
  ur: {
    type: currencyRateSchema,
    default: () => ({}),
    description: 'UNIDAD REAJUSTAB'
  },

  // Metadata
  lastSuccessfulUpdate: {
    type: Date,
    default: null,
    description: 'Timestamp of last successful sync from BCU'
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
bcuRatesSchema.statics.getSettings = async function() {
  let settings = await this.findById('bcu_rates');
  if (!settings) {
    settings = await this.create({ _id: 'bcu_rates' });
  }
  return settings;
};

/**
 * Static method to update rates
 * @param {Object} rates - Object containing rate updates
 * @param {Boolean} success - Whether the update was successful
 * @param {String} errorMessage - Error message if update failed
 */
bcuRatesSchema.statics.updateRates = async function(rates, success = true, errorMessage = '') {
  const settings = await this.getSettings();

  if (success && rates) {
    // Calculate percentage changes before updating
    const currencyKeys = ['usdBillete', 'usdCable', 'usdPromedio', 'ars', 'brl', 'ui', 'up', 'ur'];

    currencyKeys.forEach(key => {
      if (rates[key]) {
        const currentRate = settings[key];
        const newVenta = rates[key].venta;

        // Calculate change percentage
        if (currentRate.venta > 0 && newVenta > 0) {
          const change = ((newVenta - currentRate.venta) / currentRate.venta) * 100;
          rates[key].change24h = parseFloat(change.toFixed(2));
          rates[key].previousVenta = currentRate.venta;
        } else {
          rates[key].change24h = 0;
          rates[key].previousVenta = newVenta;
        }
      }
    });

    // Update all rates
    Object.assign(settings, rates);
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
 * Instance method to get all rates in a friendly format
 */
bcuRatesSchema.methods.getAllRates = function() {
  return {
    USD: {
      billete: this.usdBillete.venta,
      cable: this.usdCable.venta,
      promedio: this.usdPromedio.venta,
      change: this.usdBillete.change24h
    },
    EUR: null, // Not provided by BCU in the given HTML
    ARS: {
      value: this.ars.venta,
      change: this.ars.change24h
    },
    BRL: {
      value: this.brl.venta,
      change: this.brl.change24h
    },
    UI: {
      value: this.ui.venta,
      change: this.ui.change24h
    },
    UP: {
      value: this.up.venta,
      change: this.up.change24h
    },
    UR: {
      value: this.ur.venta,
      change: this.ur.change24h
    },
    lastUpdate: this.lastSuccessfulUpdate,
    hasError: this.hasError,
    errorMessage: this.errorMessage
  };
};

const BcuRates = mongoose.model('BcuRates', bcuRatesSchema);

export default BcuRates;
