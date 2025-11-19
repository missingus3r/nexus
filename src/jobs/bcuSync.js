import { syncBcuRates } from '../services/bcuService.js';
import logger from '../utils/logger.js';

/**
 * Run BCU synchronization job
 * Fetches exchange rates from BCU and updates database
 * @returns {Promise<void>}
 */
export async function runBcuSync() {
  const startTime = Date.now();

  try {
    logger.info('=== BCU Sync Job Started ===');

    // Sync rates from BCU
    const updatedRates = await syncBcuRates();

    const duration = Date.now() - startTime;
    logger.info(`=== BCU Sync Job Completed in ${duration}ms ===`);
    logger.info(`Last update: ${updatedRates.lastSuccessfulUpdate}`);

    return updatedRates;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`=== BCU Sync Job Failed after ${duration}ms ===`);
    logger.error('Error:', error.message);
    logger.error('Stack:', error.stack);

    // Don't throw - we want the cron job to continue running
    // The error has already been logged in the database by syncBcuRates
    return null;
  }
}
