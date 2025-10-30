import { auth } from 'express-openid-connect';

/**
 * Auth0 Configuration
 *
 * This configuration uses express-openid-connect to integrate Auth0
 * Automatically creates routes:
 * - /login - Redirects to Auth0 login
 * - /logout - Logs out and redirects
 * - /callback - Auth0 callback handler
 */
const auth0Config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET,
  baseURL: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  // Additional useful settings
  routes: {
    callback: '/callback',
    login: '/login',
    logout: '/logout'
  }
};

/**
 * Auth0 middleware
 * Attaches /login, /logout, and /callback routes to the baseURL
 */
export const auth0Middleware = auth(auth0Config);

/**
 * Middleware to check if user is authenticated
 * Use this to protect routes that require authentication
 */
export const requireAuth = (req, res, next) => {
  if (!req.oidc.isAuthenticated()) {
    return res.redirect('/login');
  }
  next();
};

/**
 * Middleware to make OIDC context available in views
 * This makes req.oidc available in all EJS templates
 */
export const setupOidcLocals = (req, res, next) => {
  res.locals.isAuthenticated = req.oidc.isAuthenticated();
  res.locals.user = req.oidc.user || null;
  next();
};
