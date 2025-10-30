import Subscription from '../models/Subscription.js';
import { User } from '../models/index.js';
import logger from '../utils/logger.js';

/**
 * Subscription service for managing user subscriptions
 */
class SubscriptionService {
  /**
   * Get all available plans with pricing
   * @returns {Object} - Plans organized by type
   */
  getAvailablePlans() {
    return {
      personal: [
        {
          id: 'free',
          name: 'Free',
          description: 'Perfecto para comenzar a explorar Vortex',
          priceMonthly: { usd: 0, uyu: 0 },
          priceYearly: { usd: 0, uyu: 0 },
          features: [
            'Hasta 5 reportes de incidentes al mes',
            'Acceso al mapa en tiempo real',
            'Visualización de noticias geolocalizadas',
            'Navegación de Surlink (solo búsqueda)',
            'Acceso al foro comunitario'
          ],
          limitations: [
            'Sin alertas personalizadas',
            'Sin datos históricos',
            'Sin analytics',
            'Publicidad incluida'
          ],
          popular: false
        },
        {
          id: 'premium',
          name: 'Premium',
          description: 'Para usuarios que quieren más control y funcionalidades',
          priceMonthly: { usd: 8, uyu: 350 },
          priceYearly: { usd: 86, uyu: 3780 }, // 10% discount
          features: [
            'Reportes ilimitados de incidentes',
            'Alertas personalizadas por zona',
            'Acceso a datos históricos',
            'Guardar favoritos en Surlink',
            'Estadísticas de tu actividad',
            'Todo lo del plan Free'
          ],
          limitations: [
            'Sin analytics avanzado',
            'Sin acceso a la API',
            'Publicidad incluida'
          ],
          popular: true
        },
        {
          id: 'pro',
          name: 'Pro',
          description: 'Para usuarios avanzados que necesitan acceso total',
          priceMonthly: { usd: 25, uyu: 1100 },
          priceYearly: { usd: 270, uyu: 11880 }, // 10% discount
          features: [
            'Dashboard de analytics avanzado',
            'Acceso a la API REST',
            'Exportación de datos (PDF/Excel)',
            'Experiencia sin publicidad',
            'Soporte prioritario vía email',
            'Todo lo del plan Premium'
          ],
          limitations: [],
          popular: false
        }
      ],
      business: [
        {
          id: 'business',
          name: 'Business',
          description: 'Para inmobiliarias y concesionarias',
          priceMonthly: { usd: 50, uyu: 2200 },
          priceYearly: { usd: 540, uyu: 23760 }, // 10% discount
          features: [
            '10 publicaciones destacadas/mes en Surlink',
            'Analytics de vistas y contactos',
            'Reportes ilimitados de incidentes',
            'Acceso a datos históricos de zonas',
            'Alertas de seguridad personalizadas',
            'Sin publicidad',
            'Soporte prioritario'
          ],
          limitations: [
            'Sin acceso a la API',
            'Sin white-label'
          ],
          popular: true
        },
        {
          id: 'enterprise',
          name: 'Enterprise',
          description: 'Para grandes empresas y corporaciones',
          priceMonthly: { usd: 150, uyu: 6600 },
          priceYearly: { usd: 1620, uyu: 71280 }, // 10% discount
          features: [
            '30 publicaciones destacadas/mes en Surlink',
            'Analytics avanzado con exportación',
            'Acceso completo a la API',
            'Dashboard corporativo personalizado',
            'Integración con sistemas propios',
            'Soporte técnico prioritario',
            'Sin publicidad',
            'Todo lo del plan Business'
          ],
          limitations: [
            'Sin white-label completo'
          ],
          popular: false
        },
        {
          id: 'white-label',
          name: 'White-Label',
          description: 'Plataforma completa para tu ciudad o región',
          priceMonthly: { usd: 500, uyu: 22000 },
          priceYearly: { usd: 5400, uyu: 237600 }, // 10% discount
          features: [
            'Plataforma completa personalizada',
            'Publicaciones destacadas ilimitadas',
            'Branding personalizado',
            'Dominio propio incluido',
            'API completa sin restricciones',
            'Soporte técnico dedicado',
            'Setup y configuración incluidos',
            'Actualizaciones y mantenimiento',
            'Todo lo del plan Enterprise'
          ],
          limitations: [],
          popular: false
        }
      ]
    };
  }

  /**
   * Create a new subscription for a user
   * @param {string} userId - User ID
   * @param {string} plan - Plan ID
   * @param {string} planType - 'personal' or 'business'
   * @param {string} billingCycle - 'monthly' or 'yearly'
   * @returns {Promise<Object>} - Created subscription
   */
  async createSubscription(userId, plan, planType, billingCycle = 'monthly') {
    try {
      // Get plan features
      const features = Subscription.getPlanFeatures(plan);

      // Calculate price
      const plans = this.getAvailablePlans();
      const planData = plans[planType].find(p => p.id === plan);

      if (!planData) {
        throw new Error('Invalid plan');
      }

      const price = billingCycle === 'yearly' ? planData.priceYearly : planData.priceMonthly;

      // Calculate end date
      const startDate = new Date();
      const endDate = new Date(startDate);
      if (billingCycle === 'yearly') {
        endDate.setFullYear(endDate.getFullYear() + 1);
      } else {
        endDate.setMonth(endDate.getMonth() + 1);
      }

      // Create subscription
      const subscription = new Subscription({
        userId,
        plan,
        planType,
        status: 'active',
        billingCycle,
        price: {
          amount: price.usd,
          currency: 'USD'
        },
        startDate,
        endDate,
        features,
        autoRenew: false
      });

      await subscription.save();

      // Update user
      await User.findByIdAndUpdate(userId, {
        subscription: subscription._id
      });

      logger.info(`Subscription created for user ${userId}: ${plan}`);

      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  /**
   * Get user's current subscription
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} - User subscription or null
   */
  async getUserSubscription(userId) {
    try {
      const subscription = await Subscription.findOne({
        userId,
        status: 'active'
      }).sort({ createdAt: -1 });

      return subscription;
    } catch (error) {
      logger.error('Error getting user subscription:', error);
      return null;
    }
  }

  /**
   * Check if user has access to a specific feature
   * @param {string} userId - User ID
   * @param {string} featureName - Feature name
   * @returns {Promise<boolean>}
   */
  async hasFeature(userId, featureName) {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        // No subscription = free plan
        const freeFeatures = Subscription.getPlanFeatures('free');
        return freeFeatures[featureName] === true || freeFeatures[featureName] > 0;
      }

      return subscription.hasFeature(featureName);
    } catch (error) {
      logger.error('Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Check monthly usage limits
   * @param {string} userId - User ID
   * @param {string} featureName - Feature name (e.g., 'incidentReportsPerMonth')
   * @returns {Promise<{allowed: boolean, remaining: number}>}
   */
  async checkUsageLimit(userId, featureName) {
    try {
      const subscription = await this.getUserSubscription(userId);
      const plan = subscription ? subscription.plan : 'free';
      const features = Subscription.getPlanFeatures(plan);

      const limit = features[featureName];

      // -1 means unlimited
      if (limit === -1) {
        return { allowed: true, remaining: -1 };
      }

      // TODO: Implement usage tracking
      // For now, just return the limit
      return { allowed: true, remaining: limit };
    } catch (error) {
      logger.error('Error checking usage limit:', error);
      return { allowed: false, remaining: 0 };
    }
  }

  /**
   * Cancel a subscription
   * @param {string} userId - User ID
   * @returns {Promise<boolean>}
   */
  async cancelSubscription(userId) {
    try {
      const subscription = await this.getUserSubscription(userId);

      if (!subscription) {
        return false;
      }

      await subscription.cancel();
      logger.info(`Subscription cancelled for user ${userId}`);

      return true;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      return false;
    }
  }

  /**
   * Check and expire old subscriptions (cron job)
   * @returns {Promise<number>} - Number of expired subscriptions
   */
  async expireSubscriptions() {
    try {
      const result = await Subscription.updateMany(
        {
          status: 'active',
          endDate: { $lt: new Date() },
          autoRenew: false
        },
        {
          status: 'expired'
        }
      );

      logger.info(`Expired ${result.modifiedCount} subscriptions`);

      return result.modifiedCount;
    } catch (error) {
      logger.error('Error expiring subscriptions:', error);
      return 0;
    }
  }
}

// Singleton instance
const subscriptionService = new SubscriptionService();

export default subscriptionService;
