import express from 'express';
import { getCurrentRates, syncBcuRates } from '../services/bcuService.js';
import { BcuRates } from '../models/index.js';
import { requireAuth, getAuthenticatedUser } from '../config/auth0.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @route GET /exchange-rates
 * @desc Get current exchange rates from BCU
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    const rates = await getCurrentRates();

    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    logger.error('Error fetching exchange rates:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las cotizaciones'
    });
  }
});

/**
 * @route GET /exchange-rates/raw
 * @desc Get raw BCU rates document
 * @access Public
 */
router.get('/raw', async (req, res) => {
  try {
    const bcuRates = await BcuRates.getSettings();

    res.json({
      success: true,
      data: bcuRates
    });
  } catch (error) {
    logger.error('Error fetching raw BCU rates:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener las cotizaciones'
    });
  }
});

/**
 * @route POST /exchange-rates/sync
 * @desc Manually trigger BCU rates synchronization
 * @access Admin only
 */
router.post('/sync', requireAuth, async (req, res) => {
  try {
    // Check if user is admin
    const user = await getAuthenticatedUser(req);

    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'No tienes permisos para realizar esta acción'
      });
    }

    logger.info(`Manual BCU sync triggered by admin: ${user.email}`);
    const updatedRates = await syncBcuRates();

    res.json({
      success: true,
      message: 'Sincronización completada exitosamente',
      data: {
        lastUpdate: updatedRates.lastSuccessfulUpdate,
        hasError: updatedRates.hasError,
        errorMessage: updatedRates.errorMessage
      }
    });
  } catch (error) {
    logger.error('Manual BCU sync failed:', error);
    res.status(500).json({
      success: false,
      error: 'Error al sincronizar las cotizaciones',
      message: error.message
    });
  }
});

export default router;
