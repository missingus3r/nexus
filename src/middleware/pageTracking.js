import { PageVisit } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Middleware to track page visits
 * Records each page visit with user info (if logged in) or IP address (if anonymous)
 */
export const trackPageVisit = async (req, res, next) => {
  try {
    // Skip tracking for certain paths
    const skipPaths = [
      '/health',
      '/api/',
      '/uploads/',
      '/css/',
      '/js/',
      '/images/',
      '/favicon.ico',
      '/robots.txt'
    ];

    // Check if path should be skipped
    const shouldSkip = skipPaths.some(path => req.path.startsWith(path));

    if (shouldSkip) {
      return next();
    }

    // Get IP address (handle proxies)
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0].trim()
      || req.headers['x-real-ip']
      || req.connection.remoteAddress
      || req.socket.remoteAddress
      || req.ip;

    // Prepare visit data
    const visitData = {
      page: req.path,
      ipAddress: ipAddress,
      userAgent: req.headers['user-agent'] || null,
      referer: req.headers['referer'] || req.headers['referrer'] || null,
      timestamp: new Date()
    };

    // Add user info if authenticated
    if (req.session?.user) {
      visitData.userId = req.session.user._id || req.session.user.id;
      visitData.userEmail = req.session.user.email;
    } else if (req.user) {
      // Support for other auth methods
      visitData.userId = req.user._id || req.user.id;
      visitData.userEmail = req.user.email;
    }

    // Save visit asynchronously (don't block the response)
    PageVisit.create(visitData).catch(err => {
      logger.error('Error tracking page visit:', err);
    });

  } catch (error) {
    logger.error('Error in pageTracking middleware:', error);
  }

  // Continue to next middleware
  next();
};

/**
 * Get client IP address helper
 */
export const getClientIp = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim()
    || req.headers['x-real-ip']
    || req.connection.remoteAddress
    || req.socket.remoteAddress
    || req.ip;
};
