import mongoose from 'mongoose';

const userPreferencesSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Auth0 user ID (uid)'
  },

  // Favoritos por categoría
  favorites: {
    construccion: {
      type: [String],
      default: [],
      description: 'IDs de sitios favoritos de construcción'
    },
    academy: {
      type: [String],
      default: [],
      description: 'IDs de sitios favoritos de academy'
    },
    financial: {
      type: [String],
      default: [],
      description: 'IDs de sitios favoritos de financial'
    },
    listings: {
      type: [String],
      default: [],
      description: 'IDs de listings favoritos (casas, autos, etc.)'
    }
  },

  // Preferencias de navegación
  navigation: {
    surlinkActiveCategory: {
      type: String,
      default: 'casas'
    },
    surlinkActiveConstruccionTab: {
      type: String,
      default: 'proyectos'
    },
    surlinkActiveAcademyTab: {
      type: String,
      default: 'universidades'
    },
    surlinkActiveFinancialTab: {
      type: String,
      default: 'bancos'
    }
  },

  // Flags de modales de bienvenida vistos
  welcomeModals: {
    surlinkWelcomeShown: {
      type: Boolean,
      default: false
    },
    centinelWelcomeShown: {
      type: Boolean,
      default: false
    },
    forumWelcomeShown: {
      type: Boolean,
      default: false
    }
  },

  // Preferencias de UI
  ui: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto',
      description: 'Tema de la interfaz'
    }
  }
}, {
  timestamps: true
});

// Índices para mejor performance
userPreferencesSchema.index({ userId: 1 });

// Métodos de instancia

// Agregar favorito a una categoría
userPreferencesSchema.methods.addFavorite = function(category, itemId) {
  if (!this.favorites[category]) {
    return false;
  }

  if (!this.favorites[category].includes(itemId)) {
    this.favorites[category].push(itemId);
    return true;
  }

  return false;
};

// Remover favorito de una categoría
userPreferencesSchema.methods.removeFavorite = function(category, itemId) {
  if (!this.favorites[category]) {
    return false;
  }

  const index = this.favorites[category].indexOf(itemId);
  if (index > -1) {
    this.favorites[category].splice(index, 1);
    return true;
  }

  return false;
};

// Verificar si un item es favorito
userPreferencesSchema.methods.isFavorite = function(category, itemId) {
  if (!this.favorites[category]) {
    return false;
  }

  return this.favorites[category].includes(itemId);
};

// Métodos estáticos

// Obtener o crear preferencias para un usuario
userPreferencesSchema.statics.getOrCreate = async function(userId) {
  let preferences = await this.findOne({ userId });

  if (!preferences) {
    preferences = await this.create({ userId });
  }

  return preferences;
};

const UserPreferences = mongoose.model('UserPreferences', userPreferencesSchema);

export default UserPreferences;
