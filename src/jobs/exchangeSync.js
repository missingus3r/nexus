import { syncBrouRates } from '../services/brouService.js';
import { syncDgiRates } from '../services/dgiService.js';
import BcuRates from '../models/BcuRates.js';
import PricingSettings from '../models/PricingSettings.js';
import logger from '../utils/logger.js';

/**
 * Run Exchange Rates synchronization job
 * Fetches exchange rates from BROU and DGI and updates database
 * @returns {Promise<void>}
 */
export async function runExchangeSync() {
  const startTime = Date.now();

  try {
    logger.info('=== Exchange Rates Sync Job Started ===');

    // Sync rates from both sources in parallel
    logger.info('Fetching rates from BROU and DGI...');
    const [brouRates, dgiRates] = await Promise.allSettled([
      syncBrouRates(),
      syncDgiRates()
    ]);

    // Consolidate rates from both sources
    const consolidatedRates = {};

    // Add BROU rates (USD, EUR, ARS, BRL, GBP, CHF, UI)
    if (brouRates.status === 'fulfilled') {
      Object.assign(consolidatedRates, brouRates.value);
      logger.info(`Successfully fetched ${Object.keys(brouRates.value).length} rates from BROU`);
    } else {
      logger.error('BROU sync failed:', brouRates.reason.message);
    }

    // Add DGI rates (UR)
    if (dgiRates.status === 'fulfilled') {
      Object.assign(consolidatedRates, dgiRates.value);
      logger.info('Successfully fetched UR from DGI');
    } else {
      logger.error('DGI sync failed:', dgiRates.reason.message);
    }

    // Check if we got at least some rates
    if (Object.keys(consolidatedRates).length === 0) {
      throw new Error('Failed to fetch rates from both BROU and DGI sources');
    }

    // Update BcuRates model in database
    logger.info('Updating exchange rates in database...');
    const updatedRates = await BcuRates.updateRates(consolidatedRates, true);
    logger.info('Successfully updated exchange rates in database');

    // Update PricingSettings.usdToUyu with USD from BROU
    if (consolidatedRates.usdBillete && consolidatedRates.usdBillete.venta > 0) {
      logger.info(`Updating PricingSettings.usdToUyu to ${consolidatedRates.usdBillete.venta}`);
      await PricingSettings.updateSettings({
        usdToUyu: consolidatedRates.usdBillete.venta
      });
      logger.info('Successfully updated PricingSettings.usdToUyu');
    }

    const duration = Date.now() - startTime;
    logger.info(`=== Exchange Rates Sync Job Completed in ${duration}ms ===`);
    logger.info(`Last update: ${updatedRates.lastSuccessfulUpdate}`);

    return updatedRates;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`=== Exchange Rates Sync Job Failed after ${duration}ms ===`);
    logger.error('Error:', error.message);
    logger.error('Stack:', error.stack);

    // Update BcuRates with error status
    try {
      await BcuRates.updateRates(null, false, error.message);
    } catch (updateError) {
      logger.error('Failed to update exchange rates error status:', updateError);
    }

    // Don't throw - we want the cron job to continue running
    // The error has already been logged in the database
    return null;
  }
}
