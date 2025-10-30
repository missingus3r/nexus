import subscriptionService from '../services/subscriptionService.js';
import logger from '../utils/logger.js';

/**
 * Get all available plans
 */
export const getPlans = (req, res) => {
  try {
    const plans = subscriptionService.getAvailablePlans();
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    logger.error('Error getting plans:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener los planes'
    });
  }
};

/**
 * Submit a plan inquiry
 * NOTE: No automatic emails are sent. User should use mailto: links in the UI.
 */
export const submitInquiry = async (req, res) => {
  try {
    const { plan, planType, name, email, company, phone, message } = req.body;

    // Validate required fields
    if (!plan || !planType || !name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: plan, planType, name, email'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email inválido'
      });
    }

    // Validate plan exists
    const plans = subscriptionService.getAvailablePlans();
    const planExists = plans[planType]?.find(p => p.id === plan);

    if (!planExists) {
      return res.status(400).json({
        success: false,
        message: 'Plan inválido'
      });
    }

    // Log the inquiry (no email is sent automatically)
    logger.info(`Plan inquiry received: ${plan} (${planType}) from ${email}`, {
      name,
      company,
      phone,
      message
    });

    res.json({
      success: true,
      message: 'Consulta registrada. Por favor envía tu consulta usando el enlace de contacto.'
    });

  } catch (error) {
    logger.error('Error submitting inquiry:', error);
    res.status(500).json({
      success: false,
      message: 'Error al procesar la consulta'
    });
  }
};

/**
 * Get user's current subscription
 */
export const getMySubscription = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    const subscription = await subscriptionService.getUserSubscription(req.session.user.id);

    if (!subscription) {
      return res.json({
        success: true,
        subscription: {
          plan: 'free',
          planType: 'personal',
          status: 'active'
        }
      });
    }

    res.json({
      success: true,
      subscription
    });
  } catch (error) {
    logger.error('Error getting user subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener la suscripción'
    });
  }
};

/**
 * Cancel user subscription
 */
export const cancelSubscription = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    const cancelled = await subscriptionService.cancelSubscription(req.session.user.id);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró una suscripción activa'
      });
    }

    res.json({
      success: true,
      message: 'Suscripción cancelada exitosamente'
    });

    logger.info(`Subscription cancelled by user ${req.session.user.id}`);
  } catch (error) {
    logger.error('Error cancelling subscription:', error);
    res.status(500).json({
      success: false,
      message: 'Error al cancelar la suscripción'
    });
  }
};

/**
 * Check if user has access to a feature
 */
export const checkFeature = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        success: false,
        message: 'No autenticado'
      });
    }

    const { feature } = req.params;

    const hasAccess = await subscriptionService.hasFeature(req.session.user.id, feature);

    res.json({
      success: true,
      hasAccess
    });
  } catch (error) {
    logger.error('Error checking feature access:', error);
    res.status(500).json({
      success: false,
      message: 'Error al verificar acceso'
    });
  }
};
