import { auth } from 'express-openid-connect';
import User from '../models/User.js';
import logger from '../utils/logger.js';

/**
 * Get Auth0 Configuration
 * This function creates the config at runtime to ensure env vars are loaded
 *
 * This configuration uses express-openid-connect to integrate Auth0
 * Automatically creates routes:
 * - /login - Redirects to Auth0 login
 * - /logout - Logs out and redirects
 * - /callback - Auth0 callback handler
 */
function getAuth0Config() {
  return {
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
      logout: '/logout',
      postLogoutRedirect: '/'
    },
    // After successful callback, handle user creation/update
    afterCallback: async (req, res, session) => {
      try {
        const userInfo = session.user;
        const email = userInfo.email;
        const auth0Sub = userInfo.sub;

        logger.info(`Auth0 callback - User logged in: ${email}`);

        // Check if user is admin
        const adminEmail = process.env.ADMIN_EMAIL;
        const isAdmin = adminEmail && email === adminEmail;

        // Find or create user in database
        let user = await User.findOne({ email });

        if (!user) {
          // Create new user
          user = new User({
            uid: auth0Sub,
            auth0Sub: auth0Sub,
            email: email,
            name: userInfo.name || email.split('@')[0],
            picture: userInfo.picture || '',
            role: isAdmin ? 'admin' : 'user',
            reputacion: 50,
            reportCount: 0,
            validationCount: 0,
            strikes: 0,
            banned: false,
            lastLogin: new Date()
          });

          await user.save();
          logger.info(`New user created: ${email} with role: ${user.role}`);
        } else {
          // Update existing user
          user.lastLogin = new Date();
          user.lastActivity = new Date();

          // Update Auth0 info if changed
          if (user.auth0Sub !== auth0Sub) {
            user.auth0Sub = auth0Sub;
          }
          if (user.picture !== userInfo.picture) {
            user.picture = userInfo.picture;
          }
          if (user.name !== userInfo.name && userInfo.name) {
            user.name = userInfo.name;
          }

          // Update role if admin
          if (isAdmin && user.role !== 'admin') {
            user.role = 'admin';
            logger.info(`User ${email} promoted to admin`);
          }

          await user.save();
          logger.info(`User updated: ${email}`);
        }

        // Store redirect info in user object so it's accessible in req.oidc.user
        session.user.redirectTo = isAdmin ? '/admin' : '/dashboard';
        session.user.userId = user._id.toString();
        session.user.dbRole = user.role; // Store DB role

        return session;
      } catch (error) {
        logger.error('Error in Auth0 afterCallback:', error);
        // Continue with default behavior even if there's an error
        return session;
      }
    }
  };
}

/**
 * Auth0 middleware factory
 * Returns middleware that attaches /login, /logout, and /callback routes to the baseURL
 * Created lazily to ensure env vars are loaded
 */
let _auth0Middleware = null;
export function getAuth0Middleware() {
  if (!_auth0Middleware) {
    _auth0Middleware = auth(getAuth0Config());
  }
  return _auth0Middleware;
}

// For backward compatibility, export as middleware function
export const auth0Middleware = (req, res, next) => {
  return getAuth0Middleware()(req, res, next);
};

/**
 * Middleware to check if user is authenticated
 * Use this to protect routes that require authentication
 */
export const requireAuth = (req, res, next) => {
  try {
    // Check if oidc is available
    if (!req.oidc) {
      logger.error('OIDC context not available in requireAuth middleware');
      return res.status(500).json({
        error: 'Authentication system not properly initialized',
        details: 'OIDC context missing'
      });
    }

    // Check if user is authenticated
    if (!req.oidc.isAuthenticated || !req.oidc.isAuthenticated()) {
      // If this is an API request, return JSON error
      if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'No autenticado' });
      }
      // Otherwise redirect to login
      return res.redirect('/login');
    }

    next();
  } catch (error) {
    logger.error('Error in requireAuth middleware:', error);
    // If this is an API request, return JSON error
    if (req.path.startsWith('/api/')) {
      return res.status(500).json({
        error: 'Error de autenticación',
        message: error.message
      });
    }
    // Otherwise redirect to login
    return res.redirect('/login');
  }
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

/**
 * Middleware to handle post-login redirect
 * Should be placed right after auth0Middleware in server.js
 */
export const handlePostLoginRedirect = (req, res, next) => {
  // Only check for redirect on callback route
  if (req.path === '/callback' && req.oidc.isAuthenticated()) {
    const redirectTo = req.oidc.user?.redirectTo;

    if (redirectTo) {
      logger.info(`Redirecting user to: ${redirectTo}`);
      return res.redirect(redirectTo);
    }
  }
  next();
};
