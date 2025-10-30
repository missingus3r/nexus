import subscriptionService from '../services/subscriptionService.js';
import logger from '../utils/logger.js';

/**
 * Middleware to check if user has an active subscription
 * @param {string[]} allowedPlans - Array of allowed plan IDs (optional)
 */
export const requireSubscription = (allowedPlans = []) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticación requerida'
        });
      }

      // Get user subscription
      const subscription = await subscriptionService.getUserSubscription(req.session.user.id);

      // If no subscription, treat as free plan
      const currentPlan = subscription ? subscription.plan : 'free';

      // Check if current plan is in allowed plans
      if (allowedPlans.length > 0 && !allowedPlans.includes(currentPlan)) {
        return res.status(403).json({
          success: false,
          message: 'Esta función requiere una suscripción de nivel superior',
          currentPlan,
          requiredPlans: allowedPlans
        });
      }

      // Attach subscription to request for later use
      req.subscription = subscription;

      next();
    } catch (error) {
      logger.error('Error checking subscription:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar suscripción'
      });
    }
  };
};

/**
 * Middleware to check if user has access to a specific feature
 * @param {string} featureName - Feature name to check
 */
export const requireFeature = (featureName) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticación requerida'
        });
      }

      // Check if user has access to the feature
      const hasAccess = await subscriptionService.hasFeature(req.session.user.id, featureName);

      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: `Esta función requiere acceso a: ${featureName}`,
          feature: featureName,
          upgrade: true
        });
      }

      next();
    } catch (error) {
      logger.error('Error checking feature access:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar acceso'
      });
    }
  };
};

/**
 * Middleware to check usage limits (e.g., incident reports per month)
 * @param {string} limitName - Limit name to check (e.g., 'incidentReportsPerMonth')
 */
export const checkUsageLimit = (limitName) => {
  return async (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.session.user) {
        return res.status(401).json({
          success: false,
          message: 'Autenticación requerida'
        });
      }

      // Check usage limit
      const { allowed, remaining } = await subscriptionService.checkUsageLimit(
        req.session.user.id,
        limitName
      );

      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: 'Has alcanzado tu límite mensual para esta función',
          limit: limitName,
          remaining: 0,
          upgrade: true
        });
      }

      // Attach remaining usage to request
      req.usageRemaining = remaining;

      next();
    } catch (error) {
      logger.error('Error checking usage limit:', error);
      res.status(500).json({
        success: false,
        message: 'Error al verificar límite de uso'
      });
    }
  };
};

/**
 * Middleware to check if user is on premium or higher
 */
export const requirePremium = requireSubscription(['premium', 'pro']);
