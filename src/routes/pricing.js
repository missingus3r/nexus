import express from 'express';
import {
  getPlans,
  submitInquiry,
  getMySubscription,
  cancelSubscription,
  checkFeature
} from '../controllers/pricingController.js';
import { PricingSettings } from '../models/index.js';

const router = express.Router();

/**
 * @route GET /api/pricing/plans
 * @desc Get all available plans
 * @access Public
 */
router.get('/plans', getPlans);

/**
 * @route POST /api/pricing/inquiry
 * @desc Submit a plan inquiry
 * @access Public
 */
router.post('/inquiry', submitInquiry);

/**
 * @route GET /api/pricing/my-subscription
 * @desc Get current user's subscription
 * @access Private
 */
router.get('/my-subscription', getMySubscription);

/**
 * @route POST /api/pricing/cancel
 * @desc Cancel user's subscription
 * @access Private
 */
router.post('/cancel', cancelSubscription);

/**
 * @route GET /api/pricing/check-feature/:feature
 * @desc Check if user has access to a specific feature
 * @access Private
 */
router.get('/check-feature/:feature', checkFeature);

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
