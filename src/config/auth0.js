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
        // Decode the id_token to get user claims
        // In express-openid-connect, the claims are in the id_token JWT
        if (!session || !session.id_token) {
          logger.error('Auth0 afterCallback: session or id_token is undefined', { session });
          return session;
        }

        // Decode JWT token (it's already validated by Auth0 middleware)
        // The token has 3 parts: header.payload.signature
        const tokenParts = session.id_token.split('.');
        if (tokenParts.length !== 3) {
          logger.error('Auth0 afterCallback: Invalid JWT format');
          return session;
        }

        // Decode the payload (base64url encoded)
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64url').toString());

        const email = payload.email;
        const auth0Sub = payload.sub;
        const name = payload.name || payload.nickname || email.split('@')[0];
        const picture = payload.picture || '';

        if (!email || !auth0Sub) {
          logger.error('Auth0 afterCallback: Missing email or sub', { payload });
          return session;
        }

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
            name: name,
            picture: picture,
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
          if (user.picture !== picture && picture) {
            user.picture = picture;
          }
          if (user.name !== name && name) {
            user.name = name;
          }

          // Update role if admin
          if (isAdmin && user.role !== 'admin') {
            user.role = 'admin';
            logger.info(`User ${email} promoted to admin`);
          }

          await user.save();
          logger.info(`User updated: ${email}`);
        }

        // Store redirect destination in Express session (not OIDC session)
        // CRITICAL: The session parameter here is the OIDC session, not req.session
        // We need to store pendingRedirect in req.session for the redirect to work
        const redirectTo = isAdmin ? '/admin' : '/dashboard';

        // Store in Express session via req.session
        if (req.session) {
          req.session.pendingRedirect = redirectTo;
          req.session.userId = user._id.toString();
          req.session.dbRole = user.role;

          // Force session save to ensure data persists
          // This is important because afterCallback runs during the callback flow
          // and the session might not auto-save before the redirect happens
          return new Promise((resolve, reject) => {
            req.session.save((err) => {
              if (err) {
                logger.error('Error saving session in afterCallback:', err);
                reject(err);
              } else {
                logger.info(`Pending redirect stored and saved in Express session for user ${email}: ${redirectTo}`);
                resolve(session);
              }
            });
          });
        } else {
          logger.error('Express session not available in afterCallback');
          return session;
        }
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
 * Helper function to get user from either Auth0 or session
 * Returns user object with email and role, or null if not authenticated
 */
export const getAuthenticatedUser = async (req) => {
  // Check Auth0 first
  if (req.oidc && req.oidc.isAuthenticated && req.oidc.isAuthenticated()) {
    const oidcUser = req.oidc.user;

    // Get user from database to get role
    if (oidcUser.email) {
      const user = await User.findOne({ email: oidcUser.email });
      if (user) {
        return {
          email: user.email,
          name: user.name,
          role: user.role,
          uid: user.uid,
          picture: user.picture,
          _id: user._id
        };
      }
    }
  }

  // Fallback to session-based auth
  if (req.session && req.session.user) {
    return req.session.user;
  }

  return null;
};

/**
 * Middleware to handle post-login redirect on landing page
 * This runs on the root route and redirects users who just logged in
 */
export const handleLandingRedirect = async (req, res, next) => {
  // Only run on root path
  if (req.path !== '/') {
    return next();
  }

  // Debug logging to verify middleware is being called
  if (req.session?.pendingRedirect) {
    logger.info(`handleLandingRedirect - Detected pendingRedirect: ${req.session.pendingRedirect}, isAuthenticated: ${req.oidc?.isAuthenticated()}`);
  }

  // Check if user just logged in and needs redirect
  if (req.oidc && req.oidc.isAuthenticated && req.oidc.isAuthenticated()) {
    // Check if this is a fresh login (has pendingRedirect flag)
    if (req.session && req.session.pendingRedirect) {
      const redirectTo = req.session.pendingRedirect;

      // Clear the redirect flag before redirecting
      delete req.session.pendingRedirect;

      // Save session to ensure the deletion persists
      req.session.save((err) => {
        if (err) {
          logger.error('Error saving session after clearing pendingRedirect:', err);
        }
        logger.info(`Redirecting authenticated user from landing to: ${redirectTo}`);
        return res.redirect(redirectTo);
      });

      // Don't call next() here - we're handling the response
      return;
    }
  }

  next();
};
