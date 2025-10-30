import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

// Simple JWT verification middleware (no Auth0)
export const checkJwt = (req, res, next) => {
  try {
    // Get token from header or query string
    let token = null;

    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    // If no token, allow as guest (credentialsRequired: false)
    if (!token) {
      req.auth = null;
      return next();
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SIGNING_KEY);
    req.auth = decoded;
    next();
  } catch (error) {
    // Invalid token - allow as guest
    req.auth = null;
    next();
  }
};

// Middleware to check user permissions and scopes
export const requireScope = (...requiredScopes) => {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const permissions = req.auth.permissions || [];
    const hasPermission = requiredScopes.some(scope => permissions.includes(scope));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredScopes
      });
    }

    next();
  };
};

// Middleware to attach user from database
export const attachUser = async (req, res, next) => {
  try {
    if (!req.auth || !req.auth.sub) {
      // Guest user
      req.user = null;
      return next();
    }

    let user = await User.findOne({ uid: req.auth.sub });

    if (!user) {
      // First time user - create profile
      user = await User.create({
        uid: req.auth.sub,
        reputacion: 50
      });
    }

    // Check if banned
    if (user.isBanned()) {
      return res.status(403).json({
        error: 'Account temporarily banned',
        bannedUntil: user.bannedUntil
      });
    }

    // Update last activity
    user.lastActivity = new Date();
    await user.save();

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

// Generate user JWT token
export const generateUserToken = (userId, permissions = []) => {
  const payload = {
    sub: userId,
    permissions,
    type: 'user',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 7) // 7 days
  };

  return jwt.sign(payload, process.env.JWT_SIGNING_KEY);
};

// Generate guest JWT (read-only, limited)
export const generateGuestToken = () => {
  const payload = {
    sub: 'guest',
    permissions: [], // No write permissions
    type: 'guest',
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24 hours
  };

  return jwt.sign(payload, process.env.JWT_SIGNING_KEY);
};

// Middleware to check if user is moderator or admin
export const requireModerator = (req, res, next) => {
  if (!req.user || !['moderator', 'admin'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Moderator access required'
    });
  }
  next();
};

// Middleware to check if user is admin
export const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }
  next();
};
