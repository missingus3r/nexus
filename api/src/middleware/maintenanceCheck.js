import { SystemSettings } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Middleware to check if a platform is in maintenance mode
 * @param {string} platform - Platform name: 'surlink', 'centinel', 'forum', 'auth'
 */
export const checkMaintenance = (platform) => {
  return async (req, res, next) => {
    try {
      const settings = await SystemSettings.getSettings();

      // Check if platform is in maintenance
      if (settings.isInMaintenance(platform)) {
        const message = settings.maintenanceMessages[platform];

        // For API requests, return JSON
        if (req.path.startsWith('/api/')) {
          return res.status(503).json({
            error: 'Service in maintenance',
            message,
            platform,
            maintenance: true
          });
        }

        // For page requests, render maintenance page
        return res.status(503).render('maintenance', {
          title: 'Mantenimiento',
          platform,
          message,
          page: platform
        });
      }

      next();
    } catch (error) {
      logger.error('Error checking maintenance mode:', error);
      // If error checking, allow access (fail open)
      next();
    }
  };
};

/**
 * Middleware to check auth maintenance and allow admin access
 */
export const checkAuthMaintenance = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();

    // If auth is in maintenance
    if (settings.isInMaintenance('auth')) {
      // Check if user is admin (already logged in)
      if (req.session?.user?.role === 'admin') {
        return next();
      }

      // Check if it's the /admin route (allow Auth0 login for admin)
      if (req.path === '/admin' || req.path.startsWith('/admin')) {
        return next();
      }

      // Block all other auth-related requests
      if (req.path.startsWith('/api/auth') && !req.path.includes('/admin')) {
        return res.status(503).json({
          error: 'Authentication in maintenance',
          message: settings.maintenanceMessages.auth,
          maintenance: true,
          adminOnly: true
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Error checking auth maintenance:', error);
    next();
  }
};

/**
 * Get current maintenance status (public endpoint)
 */
export const getMaintenanceStatus = async (req, res) => {
  try {
    const settings = await SystemSettings.getSettings();

    res.json({
      success: true,
      maintenance: {
        surlink: settings.maintenanceMode.surlink,
        centinel: settings.maintenanceMode.centinel,
        forum: settings.maintenanceMode.forum,
        auth: settings.maintenanceMode.auth
      },
      messages: settings.maintenanceMessages
    });
  } catch (error) {
    logger.error('Error getting maintenance status:', error);
    res.status(500).json({
      error: 'Error al obtener estado de mantenimiento',
      details: error.message
    });
  }
};
