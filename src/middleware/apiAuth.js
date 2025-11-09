/**
 * API Authentication Middleware
 * Replaces JWT authentication with session-based auth + API tokens
 */

import { ApiToken, User } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Verify API request using either:
 * 1. Session (from logged-in user via Auth0)
 * 2. API Token (from programmatic access)
 *
 * Sets req.user if authenticated, null otherwise
 * Does NOT block request if not authenticated (use requireAuth for that)
 */
export const verifyApiAuth = async (req, res, next) => {
  try {
    req.user = null;
    req.authMethod = null;

    // Method 1: Check for API Token in headers
    const apiToken = req.headers['x-api-token'] || req.query.apiToken;

    if (apiToken) {
      const tokenDoc = await ApiToken.verifyToken(apiToken);

      if (tokenDoc) {
        // Load user associated with this token
        const user = await User.findOne({ uid: tokenDoc.userId });

        if (user && user.status !== 'banned') {
          req.user = user;
          req.authMethod = 'api_token';
          req.apiToken = tokenDoc;

          // Update user activity
          user.lastActivity = new Date();
          await user.save();

          logger.info(`API Token auth successful: ${tokenDoc.name} (${user.email})`);
          return next();
        } else {
          logger.warn(`API Token found but user banned or not found: ${tokenDoc.userId}`);
        }
      } else {
        logger.warn(`Invalid or revoked API token attempted`);
      }
    }

    // Method 2: Check for session (logged-in user)
    if (req.session?.user?.uid || req.oidc?.user?.email) {
      // Get user ID from session or OIDC
      const userIdentifier = req.session?.user?.uid || req.oidc?.user?.sub;
      const identifierField = req.session?.user?.uid ? 'uid' : 'uid';

      const user = await User.findOne({ [identifierField]: userIdentifier });

      if (user && user.status !== 'banned') {
        req.user = user;
        req.authMethod = 'session';

        // Update user activity
        user.lastActivity = new Date();
        await user.save();

        return next();
      } else if (user && user.status === 'banned') {
        return res.status(403).json({
          success: false,
          error: 'Account has been banned'
        });
      }
    }

    // No authentication found - guest access
    req.user = null;
    req.authMethod = 'guest';
    next();

  } catch (error) {
    logger.error('Error in verifyApiAuth:', error);
    req.user = null;
    req.authMethod = null;
    next();
  }
};

/**
 * Require authentication (either session or API token)
 * Use after verifyApiAuth
 */
export const requireAuth = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }
  next();
};

/**
 * Require admin role
 * Use after verifyApiAuth
 */
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Admin access required'
    });
  }
  next();
};

/**
 * Require moderator or admin role
 * Use after verifyApiAuth
 */
export const requireModerator = (req, res, next) => {
  if (!req.user || (req.user.role !== 'moderator' && req.user.role !== 'admin')) {
    return res.status(403).json({
      success: false,
      error: 'Moderator access required'
    });
  }
  next();
};

/**
 * Check if user has specific API permission (when using API token)
 * For session auth, relies on user role
 */
export const requirePermission = (permission) => {
  return (req, res, next) => {
    // Session users: check role-based permissions
    if (req.authMethod === 'session') {
      // Admin has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      // Add role-based permission logic here if needed
      // For now, regular users have basic permissions
      const allowedPermissions = ['read', 'write', 'incidents', 'forum'];
      if (allowedPermissions.includes(permission)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: `Permission '${permission}' required`
      });
    }

    // API token users: check token permissions
    if (req.authMethod === 'api_token') {
      if (req.apiToken.hasPermission(permission)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: `API token missing permission: ${permission}`
      });
    }

    // Guest users: no permissions
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  };
};

/**
 * Combined middleware: verify + require auth
 * Equivalent to old: checkJwt + attachUser + authenticate
 */
export const authenticate = [verifyApiAuth, requireAuth];

export default {
  verifyApiAuth,
  requireAuth,
  requireAdmin,
  requireModerator,
  requirePermission,
  authenticate
};
