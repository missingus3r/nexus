import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';

// Auth0 JWT verification middleware
export const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ['RS256'],
  credentialsRequired: false, // Allow requests without JWT (for guest access)
  getToken: function fromHeaderOrQuerystring(req) {
    // Try header first
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
      return req.headers.authorization.split(' ')[1];
    }
    // Then query string
    if (req.query && req.query.token) {
      return req.query.token;
    }
    return null;
  }
});

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
