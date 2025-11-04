/**
 * Preferences Service
 * Centralizes user preferences management with database sync for authenticated users
 * and localStorage fallback for guests
 */
(() => {
  const API_BASE = '/api/preferences';
  const DEBOUNCE_MS = 500;

  // Estado interno
  const state = {
    isAuthenticated: false,
    preferences: null,
    pendingUpdates: {},
    debounceTimers: {},
    migrated: false,
    initialized: false,
    initPromise: null
  };

  /**
   * Initialize preferences service
   */
  const init = async () => {
    // Return existing promise if already initializing
    if (state.initPromise) {
      return state.initPromise;
    }

    state.initPromise = (async () => {
      try {
        // Check if user is authenticated
        const jwt = localStorage.getItem('jwt');
        state.isAuthenticated = !!jwt;
        console.log(`[PreferencesService] Initializing... Authenticated: ${state.isAuthenticated}`);

        if (state.isAuthenticated) {
          try {
            await loadFromAPI();
            console.log('[PreferencesService] Loaded preferences from API');

            // Auto-migrate from localStorage if not done yet
            if (!state.migrated && shouldMigrate()) {
              await migrateFromLocalStorage();
            }
          } catch (error) {
            console.error('[PreferencesService] Error loading from API, falling back to localStorage:', error);
            // Fallback to localStorage
            loadFromLocalStorage();
          }
        } else {
          // Guest user - use localStorage
          console.log('[PreferencesService] Guest mode - using localStorage');
          loadFromLocalStorage();
        }

        state.initialized = true;
        console.log('[PreferencesService] Initialization complete. Preferences:', state.preferences);
      } catch (error) {
        console.error('Error initializing preferences:', error);
        // Fallback to localStorage in case of any error
        loadFromLocalStorage();
        state.initialized = true;
      }
    })();

    return state.initPromise;
  };

  /**
   * Load preferences from API
   */
  const loadFromAPI = async () => {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) return;

    const response = await fetch(API_BASE, {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to load preferences');
    }

    const data = await response.json();
    state.preferences = data.preferences;
    return state.preferences;
  };

  /**
   * Load preferences from localStorage (guest mode or fallback)
   */
  const loadFromLocalStorage = () => {
    state.preferences = {
      favorites: {
        construccion: getLocalStorageArray('construccionFavorites'),
        academy: getLocalStorageArray('academyFavorites'),
        financial: getLocalStorageArray('financialFavorites'),
        listings: []
      },
      navigation: {
        surlinkActiveCategory: localStorage.getItem('surlinkActiveCategory') || 'casas',
        surlinkActiveConstruccionTab: localStorage.getItem('surlinkActiveConstruccionTab') || 'proyectos',
        surlinkActiveAcademyTab: localStorage.getItem('surlinkActiveAcademyTab') || 'universidades',
        surlinkActiveFinancialTab: localStorage.getItem('surlinkActiveFinancialTab') || 'bancos'
      },
      welcomeModals: {
        surlinkWelcomeShown: localStorage.getItem('surlinkWelcomeShown') === 'true',
        centinelWelcomeShown: localStorage.getItem('centinelWelcomeShown') === 'true',
        forumWelcomeShown: localStorage.getItem('forumWelcomeSeen') === 'true'
      },
      ui: {
        theme: localStorage.getItem('vortex-theme') || 'auto'
      }
    };
  };

  /**
   * Get array from localStorage
   */
  const getLocalStorageArray = (key) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : [];
    } catch {
      return [];
    }
  };

  /**
   * Check if we should migrate data
   */
  const shouldMigrate = () => {
    // Check if there's any data in localStorage worth migrating
    const hasFavorites =
      localStorage.getItem('construccionFavorites') ||
      localStorage.getItem('academyFavorites') ||
      localStorage.getItem('financialFavorites');

    const hasSettings =
      localStorage.getItem('surlinkActiveCategory') ||
      localStorage.getItem('vortex-theme');

    return !!(hasFavorites || hasSettings);
  };

  /**
   * Migrate data from localStorage to database
   */
  const migrateFromLocalStorage = async () => {
    const jwt = localStorage.getItem('jwt');
    if (!jwt) return;

    const localData = {
      construccionFavorites: localStorage.getItem('construccionFavorites'),
      academyFavorites: localStorage.getItem('academyFavorites'),
      financialFavorites: localStorage.getItem('financialFavorites'),
      surlinkActiveCategory: localStorage.getItem('surlinkActiveCategory'),
      surlinkActiveConstruccionTab: localStorage.getItem('surlinkActiveConstruccionTab'),
      surlinkActiveAcademyTab: localStorage.getItem('surlinkActiveAcademyTab'),
      surlinkActiveFinancialTab: localStorage.getItem('surlinkActiveFinancialTab'),
      surlinkWelcomeShown: localStorage.getItem('surlinkWelcomeShown'),
      centinelWelcomeShown: localStorage.getItem('centinelWelcomeShown'),
      forumWelcomeSeen: localStorage.getItem('forumWelcomeSeen'),
      'vortex-theme': localStorage.getItem('vortex-theme')
    };

    try {
      const response = await fetch(`${API_BASE}/migrate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ localStorage: localData })
      });

      if (response.ok) {
        const data = await response.json();
        state.preferences = data.preferences;
        state.migrated = true;

        // Clean up localStorage (except JWT tokens)
        cleanupLocalStorage();

        console.log('✓ Preferences migrated to database');
      }
    } catch (error) {
      console.error('Error migrating preferences:', error);
    }
  };

  /**
   * Clean up localStorage after successful migration
   */
  const cleanupLocalStorage = () => {
    const keysToRemove = [
      'construccionFavorites',
      'academyFavorites',
      'financialFavorites',
      'surlinkActiveCategory',
      'surlinkActiveConstruccionTab',
      'surlinkActiveAcademyTab',
      'surlinkActiveFinancialTab',
      'surlinkWelcomeShown',
      'centinelWelcomeShown',
      'forumWelcomeSeen',
      'vortex-theme'
    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));
  };

  /**
   * Update API with debouncing
   */
  const updateAPI = (endpoint, body, debounceKey) => {
    if (!state.isAuthenticated) return;

    // Clear existing timer
    if (state.debounceTimers[debounceKey]) {
      clearTimeout(state.debounceTimers[debounceKey]);
    }

    // Set new timer
    state.debounceTimers[debounceKey] = setTimeout(async () => {
      const jwt = localStorage.getItem('jwt');
      if (!jwt) return;

      try {
        await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
      } catch (error) {
        console.error('Error updating preferences:', error);
      }
    }, DEBOUNCE_MS);
  };

  /**
   * Get favorites for a category
   */
  const getFavorites = (category) => {
    if (!state.preferences) return [];
    return state.preferences.favorites[category] || [];
  };

  /**
   * Check if item is favorite
   */
  const isFavorite = (category, itemId) => {
    const favorites = getFavorites(category);
    return favorites.includes(itemId);
  };

  /**
   * Add favorite
   */
  const addFavorite = async (category, itemId) => {
    if (!state.preferences) await init();

    const favorites = state.preferences.favorites[category] || [];

    if (!favorites.includes(itemId)) {
      favorites.push(itemId);

      if (state.isAuthenticated) {
        // Update API
        const jwt = localStorage.getItem('jwt');
        try {
          await fetch(`${API_BASE}/favorites/${category}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'add', itemId })
          });
        } catch (error) {
          console.error('Error adding favorite:', error);
        }
      } else {
        // Guest: update localStorage
        const key = `${category}Favorites`;
        localStorage.setItem(key, JSON.stringify(favorites));
      }
    }

    return favorites;
  };

  /**
   * Remove favorite
   */
  const removeFavorite = async (category, itemId) => {
    if (!state.preferences) await init();

    const favorites = state.preferences.favorites[category] || [];
    const index = favorites.indexOf(itemId);

    if (index > -1) {
      favorites.splice(index, 1);

      if (state.isAuthenticated) {
        // Update API
        const jwt = localStorage.getItem('jwt');
        try {
          await fetch(`${API_BASE}/favorites/${category}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'remove', itemId })
          });
        } catch (error) {
          console.error('Error removing favorite:', error);
        }
      } else {
        // Guest: update localStorage
        const key = `${category}Favorites`;
        localStorage.setItem(key, JSON.stringify(favorites));
      }
    }

    return favorites;
  };

  /**
   * Set navigation preference
   */
  const setNavigation = (key, value) => {
    if (!state.preferences) return;

    state.preferences.navigation[key] = value;

    if (state.isAuthenticated) {
      updateAPI(`${API_BASE}/navigation`, { [key]: value }, `nav-${key}`);
    } else {
      localStorage.setItem(key, value);
    }
  };

  /**
   * Get navigation preference
   */
  const getNavigation = (key) => {
    if (!state.preferences) return null;
    return state.preferences.navigation[key];
  };

  /**
   * Set welcome modal seen
   */
  const setWelcomeModal = async (modalName, seen) => {
    // Ensure service is initialized
    if (!state.initialized) {
      await init();
    }

    if (!state.preferences) return;

    state.preferences.welcomeModals[modalName] = seen;

    if (state.isAuthenticated) {
      console.log(`[PreferencesService] Saving ${modalName} = ${seen} to API`);
      updateAPI(`${API_BASE}/welcome-modals`, { [modalName]: seen }, `modal-${modalName}`);
    } else {
      // Map to localStorage keys
      const localKey = modalName === 'forumWelcomeShown' ? 'forumWelcomeSeen' : modalName;
      localStorage.setItem(localKey, seen.toString());
      console.log(`[PreferencesService] Saved ${modalName} = ${seen} to localStorage (${localKey})`);
    }
  };

  /**
   * Get welcome modal status
   */
  const getWelcomeModal = async (modalName) => {
    // Ensure service is initialized
    if (!state.initialized) {
      await init();
    }

    if (!state.preferences) return false;
    const value = state.preferences.welcomeModals[modalName] || false;
    console.log(`[PreferencesService] Get ${modalName} = ${value}`);
    return value;
  };

  /**
   * Set theme
   */
  const setTheme = (theme) => {
    if (!state.preferences) return;

    state.preferences.ui.theme = theme;

    if (state.isAuthenticated) {
      updateAPI(`${API_BASE}/theme`, { theme }, 'theme');
    } else {
      localStorage.setItem('vortex-theme', theme);
    }
  };

  /**
   * Get theme
   */
  const getTheme = () => {
    if (!state.preferences) return 'auto';
    return state.preferences.ui.theme || 'auto';
  };

  /**
   * Refresh preferences from server
   */
  const refresh = async () => {
    if (state.isAuthenticated) {
      await loadFromAPI();
    } else {
      loadFromLocalStorage();
    }
  };

  /**
   * Wait for initialization to complete
   */
  const waitForInit = async () => {
    if (!state.initialized) {
      await init();
    }
  };

  // Public API
  window.PreferencesService = {
    init,
    waitForInit,
    getFavorites,
    isFavorite,
    addFavorite,
    removeFavorite,
    setNavigation,
    getNavigation,
    setWelcomeModal,
    getWelcomeModal,
    setTheme,
    getTheme,
    refresh,
    get isAuthenticated() { return state.isAuthenticated; },
    get isInitialized() { return state.initialized; }
  };

  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
