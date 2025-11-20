import { syncBitcoinPrice } from '../services/bitcoinService.js';
import logger from '../utils/logger.js';

/**
 * Run Bitcoin price synchronization job
 * Fetches Bitcoin price from CoinGecko and updates database
 * @returns {Promise<void>}
 */
export async function runBitcoinSync() {
  const startTime = Date.now();

  try {
    logger.info('=== Bitcoin Sync Job Started ===');

    // Sync Bitcoin price from CoinGecko
    const updatedPrice = await syncBitcoinPrice();

    const duration = Date.now() - startTime;
    logger.info(`=== Bitcoin Sync Job Completed in ${duration}ms ===`);
    logger.info(`Last update: ${updatedPrice.lastSuccessfulUpdate}`);

    return updatedPrice;

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error(`=== Bitcoin Sync Job Failed after ${duration}ms ===`);
    logger.error('Error:', error.message);
    logger.error('Stack:', error.stack);

    // Don't throw - we want the interval to continue running
    // The error has already been logged in the database by syncBitcoinPrice
    return null;
  }
}
