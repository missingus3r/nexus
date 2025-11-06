import express from 'express';
import { PricingSettings } from '../models/index.js';

const router = express.Router();

/**
 * @route GET /api/pricing/plans
 * @desc Get all available plans (read-only, for display purposes)
 * @access Public
 */
router.get('/plans', async (req, res) => {
  try {
    const settings = await PricingSettings.getSettings();

    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'USD',
        interval: 'lifetime',
        features: [
          'Hasta 5 reportes de incidentes al mes',
          'Acceso al mapa en tiempo real',
          'Visualización de noticias geolocalizadas',
          'Navegación de Surlink (solo búsqueda)',
          'Acceso al foro comunitario'
        ],
        active: true
      },
      {
        id: 'premium',
        name: 'Premium',
        price: settings.proMonthly || 5,
        priceYearly: settings.proYearly || 54,
        currency: 'USD',
        interval: 'month',
        features: [
          'Reportes ilimitados de incidentes',
          'Publicaciones en Surlink (casas o autos)',
          'Acceso a la API REST',
          'Exportación de datos (PDF/Excel)',
          'Chatbot IA con GPT-5 para búsqueda inteligente',
          'Soporte prioritario',
          'Acceso anticipado a nuevas funcionalidades',
          'Aparición en el muro de donadores',
          'Todo lo del plan Free'
        ],
        active: true,
        priceUyu: Math.round((settings.proMonthly || 5) * settings.usdToUyu),
        priceUyuYearly: Math.round((settings.proYearly || 54) * settings.usdToUyu),
        popular: true
      }
    ];

    res.json({
      success: true,
      plans,
      contactEmail: 'info.vortexlabs@protonmail.com'
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Error al obtener planes' });
  }
});

/**
 * @route GET /api/pricing/settings
 * @desc Get current pricing settings
 * @access Public
 */
router.get('/settings', async (req, res) => {
  try {
    const settings = await PricingSettings.getSettings();

    res.json({
      success: true,
      pricing: {
        usdToUyu: settings.usdToUyu,
        plans: {
          premium: {
            monthly: settings.premiumMonthly,
            yearly: settings.premiumYearly
          },
          pro: {
            monthly: settings.proMonthly,
            yearly: settings.proYearly
          }
        }
      }
    });
  } catch (error) {
    console.error('Error fetching pricing settings:', error);
    res.status(500).json({ error: 'Error al obtener configuración de precios' });
  }
});

export default router;
