/**
 * Preferences Service
 * Centralizes user preferences management with database sync for authenticated users
 * and localStorage fallback for guests
 */
(() => {
  const API_BASE = '/preferences';
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
   * Load guest preferences from localStorage
   */
  const loadGuestPreferences = () => {
    try {
      const stored = localStorage.getItem('vortex_guest_preferences');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading guest preferences from localStorage:', error);
    }
    return null;
  };

  /**
   * Save guest preferences to localStorage
   */
  const saveGuestPreferences = (preferences) => {
    try {
      localStorage.setItem('vortex_guest_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving guest preferences to localStorage:', error);
    }
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
        // Check if user is authenticated by trying to load preferences
        console.log(`[PreferencesService] Initializing...`);

        try {
          await loadFromAPI();
          state.isAuthenticated = true;
          console.log('[PreferencesService] Loaded preferences from API - User authenticated');
        } catch (error) {
          // If API call fails, user is not authenticated (guest mode)
          state.isAuthenticated = false;
          console.log('[PreferencesService] Guest mode - using localStorage');

          // Load from localStorage or use defaults
          const guestPrefs = loadGuestPreferences();

          state.preferences = {
            favorites: { construccion: [], academy: [], financial: [], listings: [] },
            navigation: {
              surlinkActiveCategory: guestPrefs?.navigation?.surlinkActiveCategory || 'construccion',
              surlinkActiveConstruccionTab: guestPrefs?.navigation?.surlinkActiveConstruccionTab || 'proyectos',
              surlinkActiveAcademyTab: guestPrefs?.navigation?.surlinkActiveAcademyTab || 'universidades',
              surlinkActiveFinancialTab: guestPrefs?.navigation?.surlinkActiveFinancialTab || 'bancos',
              surlinkActiveTrabajosTab: guestPrefs?.navigation?.surlinkActiveTrabajosTab || 'ofertas'
            },
            welcomeModals: {
              surlinkWelcomeShown: guestPrefs?.welcomeModals?.surlinkWelcomeShown || false,
              centinelWelcomeShown: guestPrefs?.welcomeModals?.centinelWelcomeShown || false,
              forumWelcomeShown: guestPrefs?.welcomeModals?.forumWelcomeShown || false
            },
            ui: { theme: guestPrefs?.ui?.theme || 'auto' }
          };
        }

        state.initialized = true;
        console.log('[PreferencesService] Initialization complete. Preferences:', state.preferences);
      } catch (error) {
        console.error('Error initializing preferences:', error);
        state.initialized = true;
      }
    })();

    return state.initPromise;
  };

  /**
   * Load preferences from API
   */
  const loadFromAPI = async () => {
    const response = await fetch(API_BASE, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to load preferences');
    }

    const data = await response.json();
    state.preferences = data.preferences;
    return state.preferences;
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
      try {
        await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
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
        try {
          await fetch(`${API_BASE}/favorites/${category}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ action: 'add', itemId })
          });
        } catch (error) {
          console.error('Error adding favorite:', error);
        }
      }
      // Note: Guests cannot save favorites (requires authentication)
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
        try {
          await fetch(`${API_BASE}/favorites/${category}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ action: 'remove', itemId })
          });
        } catch (error) {
          console.error('Error removing favorite:', error);
        }
      }
      // Note: Guests cannot save favorites (requires authentication)
    }

    return favorites;
  };

  /**
   * Set navigation preference
   */
  const setNavigation = async (key, value) => {
    // Ensure service is initialized
    if (!state.initialized) {
      await init();
    }

    if (!state.preferences) return;

    state.preferences.navigation[key] = value;

    if (state.isAuthenticated) {
      console.log(`[PreferencesService] Saving navigation ${key} = ${value} to API`);
      updateAPI(`${API_BASE}/navigation`, { [key]: value }, `nav-${key}`);
    } else {
      // Save to localStorage for guests
      console.log(`[PreferencesService] Saving navigation ${key} = ${value} to localStorage`);
      saveGuestPreferences(state.preferences);
    }
  };

  /**
   * Get navigation preference
   * If key is provided, returns that specific value
   * If no key provided, returns the entire navigation object
   */
  const getNavigation = async (key) => {
    // Ensure service is initialized
    if (!state.initialized) {
      await init();
    }

    if (!state.preferences) return key ? null : {};
    const result = key ? state.preferences.navigation[key] : state.preferences.navigation;
    console.log(`[PreferencesService] Get navigation ${key || 'all'} =`, result);
    return result;
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
      // Save to localStorage for guests
      console.log(`[PreferencesService] Saving ${modalName} = ${seen} to localStorage`);
      saveGuestPreferences(state.preferences);
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
  const setTheme = async (theme) => {
    // Ensure service is initialized
    if (!state.initialized) {
      await init();
    }

    if (!state.preferences) return;

    state.preferences.ui.theme = theme;

    if (state.isAuthenticated) {
      updateAPI(`${API_BASE}/theme`, { theme }, 'theme');
    } else {
      // Save to localStorage for guests
      console.log(`[PreferencesService] Saving theme ${theme} to localStorage`);
      saveGuestPreferences(state.preferences);
    }
  };

  /**
   * Get theme
   */
  const getTheme = async () => {
    // Ensure service is initialized
    if (!state.initialized) {
      await init();
    }

    if (!state.preferences) return 'auto';
    const theme = state.preferences.ui.theme || 'auto';
    console.log(`[PreferencesService] Get theme = ${theme}`);
    return theme;
  };

  /**
   * Refresh preferences from server
   */
  const refresh = async () => {
    if (state.isAuthenticated) {
      await loadFromAPI();
    }
    // Note: Guests use in-memory defaults, no refresh needed
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
