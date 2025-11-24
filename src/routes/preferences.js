import express from 'express';
import { UserPreferences } from '../models/index.js';
import { verifyApiAuth, requireAuth } from '../middleware/apiAuth.js';

const router = express.Router();

// Todos los endpoints requieren autenticación
router.use(verifyApiAuth);
router.use(requireAuth); // All preference routes require authentication

/**
 * GET /preferences
 * Obtener todas las preferencias del usuario
 */
router.get('/', async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.auth || !req.auth.sub) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    const userId = req.auth.sub;
    const preferences = await UserPreferences.getOrCreate(userId);

    res.json({
      success: true,
      preferences: {
        favorites: preferences.favorites,
        navigation: preferences.navigation,
        welcomeModals: preferences.welcomeModals,
        ui: preferences.ui
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /preferences/favorites/:category
 * Actualizar favoritos de una categoría específica
 * Body: { action: 'add' | 'remove', itemId: string }
 */
router.put('/favorites/:category', async (req, res, next) => {
  try {
    if (!req.auth || !req.auth.sub) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    const userId = req.auth.sub;
    const { category } = req.params;
    const { action, itemId } = req.body;

    if (!['construccion', 'academy', 'financial', 'listings'].includes(category)) {
      return res.status(400).json({
        success: false,
        error: 'Categoría inválida'
      });
    }

    if (!['add', 'remove'].includes(action)) {
      return res.status(400).json({
        success: false,
        error: 'Acción inválida. Usa "add" o "remove"'
      });
    }

    if (!itemId) {
      return res.status(400).json({
        success: false,
        error: 'itemId es requerido'
      });
    }

    const preferences = await UserPreferences.getOrCreate(userId);

    let modified = false;
    if (action === 'add') {
      modified = preferences.addFavorite(category, itemId);
    } else {
      modified = preferences.removeFavorite(category, itemId);
    }

    if (modified) {
      await preferences.save();
    }

    res.json({
      success: true,
      favorites: preferences.favorites[category],
      isLiked: preferences.isFavorite(category, itemId)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /preferences/navigation
 * Actualizar preferencias de navegación
 * Body: { key: value } donde key puede ser surlinkActiveCategory, etc.
 */
router.put('/navigation', async (req, res, next) => {
  try {
    if (!req.auth || !req.auth.sub) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    const userId = req.auth.sub;
    const updates = req.body;

    const validKeys = [
      'surlinkActiveCategory',
      'surlinkActiveConstruccionTab',
      'surlinkActiveAcademyTab',
      'surlinkActiveFinancialTab'
    ];

    const preferences = await UserPreferences.getOrCreate(userId);

    let hasChanges = false;
    for (const [key, value] of Object.entries(updates)) {
      if (validKeys.includes(key) && typeof value === 'string') {
        preferences.navigation[key] = value;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await preferences.save();
    }

    res.json({
      success: true,
      navigation: preferences.navigation
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /preferences/welcome-modals
 * Actualizar flags de modales de bienvenida
 * Body: { modalName: true/false }
 */
router.put('/welcome-modals', async (req, res, next) => {
  try {
    if (!req.auth || !req.auth.sub) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    const userId = req.auth.sub;
    const updates = req.body;

    const validModals = [
      'surlinkWelcomeShown',
      'centinelWelcomeShown',
      'forumWelcomeShown'
    ];

    const preferences = await UserPreferences.getOrCreate(userId);

    let hasChanges = false;
    for (const [key, value] of Object.entries(updates)) {
      if (validModals.includes(key) && typeof value === 'boolean') {
        preferences.welcomeModals[key] = value;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await preferences.save();
    }

    res.json({
      success: true,
      welcomeModals: preferences.welcomeModals
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /preferences/theme
 * Actualizar tema de la UI
 * Body: { theme: 'light' | 'dark' | 'auto' }
 */
router.put('/theme', async (req, res, next) => {
  try {
    if (!req.auth || !req.auth.sub) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    const userId = req.auth.sub;
    const { theme } = req.body;

    if (!['light', 'dark', 'auto'].includes(theme)) {
      return res.status(400).json({
        success: false,
        error: 'Tema inválido. Usa "light", "dark" o "auto"'
      });
    }

    const preferences = await UserPreferences.getOrCreate(userId);
    preferences.ui.theme = theme;
    await preferences.save();

    res.json({
      success: true,
      theme: preferences.ui.theme
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /preferences/migrate
 * Migrar datos de localStorage a la base de datos
 * Body: { localStorage: {...} } - objeto con todos los datos de localStorage
 */
router.post('/migrate', async (req, res, next) => {
  try {
    if (!req.auth || !req.auth.sub) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    const userId = req.auth.sub;
    const { localStorage: localData } = req.body;

    if (!localData || typeof localData !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un objeto localStorage'
      });
    }

    const preferences = await UserPreferences.getOrCreate(userId);

    // Migrar favoritos
    if (localData.construccionFavorites) {
      try {
        const favorites = JSON.parse(localData.construccionFavorites);
        if (Array.isArray(favorites)) {
          preferences.favorites.construccion = [...new Set([...preferences.favorites.construccion, ...favorites])];
        }
      } catch (e) {
        console.error('Error parsing construccionFavorites:', e);
      }
    }

    if (localData.academyFavorites) {
      try {
        const favorites = JSON.parse(localData.academyFavorites);
        if (Array.isArray(favorites)) {
          preferences.favorites.academy = [...new Set([...preferences.favorites.academy, ...favorites])];
        }
      } catch (e) {
        console.error('Error parsing academyFavorites:', e);
      }
    }

    if (localData.financialFavorites) {
      try {
        const favorites = JSON.parse(localData.financialFavorites);
        if (Array.isArray(favorites)) {
          preferences.favorites.financial = [...new Set([...preferences.favorites.financial, ...favorites])];
        }
      } catch (e) {
        console.error('Error parsing financialFavorites:', e);
      }
    }

    // Migrar navegación
    if (localData.surlinkActiveCategory) {
      preferences.navigation.surlinkActiveCategory = localData.surlinkActiveCategory;
    }
    if (localData.surlinkActiveConstruccionTab) {
      preferences.navigation.surlinkActiveConstruccionTab = localData.surlinkActiveConstruccionTab;
    }
    if (localData.surlinkActiveAcademyTab) {
      preferences.navigation.surlinkActiveAcademyTab = localData.surlinkActiveAcademyTab;
    }
    if (localData.surlinkActiveFinancialTab) {
      preferences.navigation.surlinkActiveFinancialTab = localData.surlinkActiveFinancialTab;
    }

    // Migrar modales de bienvenida
    if (localData.surlinkWelcomeShown === 'true') {
      preferences.welcomeModals.surlinkWelcomeShown = true;
    }
    if (localData.centinelWelcomeShown === 'true') {
      preferences.welcomeModals.centinelWelcomeShown = true;
    }
    if (localData.forumWelcomeSeen === 'true') {
      preferences.welcomeModals.forumWelcomeShown = true;
    }

    // Migrar tema
    if (localData['austra-theme']) {
      preferences.ui.theme = localData['austra-theme'];
    }

    await preferences.save();

    res.json({
      success: true,
      message: 'Datos migrados exitosamente',
      preferences: {
        favorites: preferences.favorites,
        navigation: preferences.navigation,
        welcomeModals: preferences.welcomeModals,
        ui: preferences.ui
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
