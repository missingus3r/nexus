/**
 * Authentication utilities for managing JWT tokens
 * Handles both authenticated user tokens and guest tokens
 */

// Token storage keys
const TOKEN_KEY = 'jwt';
const TOKEN_EXPIRY_KEY = 'jwt_expiry';
const TOKEN_TYPE_KEY = 'jwt_type';

/**
 * Check if current token is valid and not expired
 */
function isTokenValid() {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

  if (!token || !expiry) {
    return false;
  }

  // Check if token is expired (with 1 minute buffer)
  const expiryTime = parseInt(expiry, 10);
  const now = Math.floor(Date.now() / 1000);

  return now < (expiryTime - 60);
}

/**
 * Store token in localStorage with expiry information
 */
function storeToken(token, expiresIn, type) {
  const expiryTime = Math.floor(Date.now() / 1000) + expiresIn;

  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
  localStorage.setItem(TOKEN_TYPE_KEY, type);
}

/**
 * Clear token from localStorage
 */
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(TOKEN_TYPE_KEY);
}

/**
 * Get user token for authenticated users
 * Returns null if user is not authenticated
 */
async function getUserToken() {
  try {
    const response = await fetch('/api/auth/user-token', {
      method: 'POST',
      credentials: 'include' // Include session cookie
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    storeToken(data.token, data.expiresIn, data.type);

    return data.token;
  } catch (error) {
    console.error('Error getting user token:', error);
    return null;
  }
}

/**
 * Get guest token for unauthenticated users
 */
async function getGuestToken() {
  try {
    const response = await fetch('/api/auth/guest-token', {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error('Failed to get guest token');
    }

    const data = await response.json();
    storeToken(data.token, data.expiresIn, data.type);

    return data.token;
  } catch (error) {
    console.error('Error getting guest token:', error);
    return null;
  }
}

/**
 * Get authentication token (user or guest)
 * This is the main function to use throughout the application
 *
 * @param {boolean} forceRefresh - Force getting a new token even if current one is valid
 * @returns {Promise<string|null>} JWT token or null if failed
 */
async function getAuthToken(forceRefresh = false) {
  // If we have a valid token and not forcing refresh, return it
  if (!forceRefresh && isTokenValid()) {
    return localStorage.getItem(TOKEN_KEY);
  }

  // Clear expired token
  clearToken();

  // Try to get user token first (for authenticated users)
  let token = await getUserToken();

  // If no user token, get guest token
  if (!token) {
    token = await getGuestToken();
  }

  return token;
}

/**
 * Get current token type
 * @returns {'user'|'guest'|null}
 */
function getTokenType() {
  return localStorage.getItem(TOKEN_TYPE_KEY);
}

/**
 * Check if user is authenticated (has user token)
 * @returns {boolean}
 */
function isAuthenticated() {
  return isTokenValid() && getTokenType() === 'user';
}

/**
 * Make an authenticated fetch request
 * Automatically includes Authorization header with JWT token
 *
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
async function authenticatedFetch(url, options = {}) {
  const token = await getAuthToken();

  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`
  };

  return fetch(url, {
    ...options,
    headers
  });
}

// Export functions for use in other scripts
window.authUtils = {
  getAuthToken,
  getGuestToken, // Keep for backward compatibility
  getUserToken,
  isTokenValid,
  isAuthenticated,
  getTokenType,
  clearToken,
  authenticatedFetch
};
