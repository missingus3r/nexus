/**
 * Authentication utilities for client-side authentication state management
 * Uses session-based Auth0 authentication
 */
(function() {
  'use strict';

  // Auth state cache
  let authState = {
    isAuthenticated: false,
    user: null,
    initialized: false
  };

  // Promise to track initialization
  let initPromise = null;

  /**
   * Initialize auth state by checking session with server
   * @returns {Promise<void>}
   */
  async function initializeAuth() {
    if (initPromise) {
      return initPromise;
    }

    initPromise = (async () => {
      try {
        const response = await fetch('/auth/profile', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          authState.isAuthenticated = true;
          authState.user = data.user;
        } else {
          authState.isAuthenticated = false;
          authState.user = null;
        }
      } catch (error) {
        // If profile fetch fails, user is not authenticated
        authState.isAuthenticated = false;
        authState.user = null;
      } finally {
        authState.initialized = true;
      }
    })();

    return initPromise;
  }

  /**
   * Get authentication token (for session-based auth, returns null but ensures initialized)
   * @returns {Promise<null>}
   */
  async function getAuthToken() {
    await initializeAuth();
    // Session-based auth doesn't use client-side tokens
    // Return null to indicate no token, but user may still be authenticated
    return null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  function isAuthenticated() {
    return authState.initialized && authState.isAuthenticated;
  }

  /**
   * Get current user data
   * @returns {object|null}
   */
  function getCurrentUser() {
    return authState.user;
  }

  /**
   * Get user ID from token (legacy function for compatibility)
   * Since we use session-based auth, extract from cached user data
   * @param {string|null} token - Unused, kept for API compatibility
   * @returns {string|null}
   */
  function getUserIdFromToken(token) {
    if (authState.user && authState.user.id) {
      return authState.user.id;
    }
    return null;
  }

  /**
   * Refresh auth state
   * @returns {Promise<void>}
   */
  async function refreshAuth() {
    authState.initialized = false;
    initPromise = null;
    await initializeAuth();
  }

  // Export authUtils to window
  window.authUtils = {
    getAuthToken,
    isAuthenticated,
    getCurrentUser,
    refreshAuth,
    // Export for legacy code compatibility
    getUserIdFromToken
  };

  // Make getUserIdFromToken available globally for legacy code
  window.getUserIdFromToken = getUserIdFromToken;

  // Auto-initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
  } else {
    initializeAuth();
  }
})();
