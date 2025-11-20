import https from 'https';
import BitcoinPrice from '../models/BitcoinPrice.js';
import logger from '../utils/logger.js';

const COINGECKO_API_URL = process.env.COINGECKO_API_URL || 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true';

/**
 * Fetch Bitcoin price from CoinGecko API
 * @returns {Promise<Object>} Bitcoin data
 */
function fetchBitcoinData() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout - CoinGecko API did not respond in time'));
    }, 10000); // 10 second timeout

    https.get(COINGECKO_API_URL, { timeout: 10000 }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        clearTimeout(timeout);
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (error) {
            reject(new Error('Failed to parse CoinGecko JSON response'));
          }
        } else {
          reject(new Error(`CoinGecko API returned status code ${res.statusCode}`));
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Sync Bitcoin price from CoinGecko API
 * Main function that orchestrates fetching, parsing, and updating database
 * @returns {Promise<Object>} Updated BitcoinPrice document
 */
export async function syncBitcoinPrice() {
  logger.info('Starting Bitcoin price synchronization...');

  try {
    // Step 1: Fetch data from CoinGecko
    logger.info('Fetching Bitcoin price from CoinGecko API...');
    const response = await fetchBitcoinData();
    logger.info('Successfully fetched Bitcoin data from CoinGecko');

    // Step 2: Parse response
    if (!response || !response.bitcoin) {
      throw new Error('Invalid response format from CoinGecko API');
    }

    const bitcoinData = {
      price: response.bitcoin.usd || 0,
      change24h: response.bitcoin.usd_24h_change || 0
    };

    logger.info(`Bitcoin price: USD ${bitcoinData.price.toFixed(2)}, 24h change: ${bitcoinData.change24h.toFixed(2)}%`);

    // Step 3: Update BitcoinPrice model in database
    logger.info('Updating BitcoinPrice in database...');
    const updatedPrice = await BitcoinPrice.updatePrice(bitcoinData, true);
    logger.info('Successfully updated BitcoinPrice in database');

    logger.info('Bitcoin price synchronization completed successfully');
    return updatedPrice;

  } catch (error) {
    logger.error('Bitcoin price synchronization failed:', error);

    // Update BitcoinPrice with error status
    try {
      await BitcoinPrice.updatePrice(null, false, error.message);
    } catch (updateError) {
      logger.error('Failed to update BitcoinPrice error status:', updateError);
    }

    throw error;
  }
}

/**
 * Get current Bitcoin price from database
 * @returns {Promise<Object>} Current Bitcoin data
 */
export async function getCurrentPrice() {
  try {
    const bitcoinPrice = await BitcoinPrice.getSettings();
    return bitcoinPrice.getBitcoinData();
  } catch (error) {
    logger.error('Error getting current Bitcoin price:', error);
    throw error;
  }
}
