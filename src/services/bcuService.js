import https from 'https';
import * as cheerio from 'cheerio';
import BcuRates from '../models/BcuRates.js';
import PricingSettings from '../models/PricingSettings.js';
import logger from '../../logger.js';

const BCU_URL = 'https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Paginas/Cotizaciones.aspx';

/**
 * Fetch HTML content from BCU website
 * @returns {Promise<string>} HTML content
 */
function fetchBcuHtml() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout - BCU website did not respond in time'));
    }, 15000); // 15 second timeout

    https.get(BCU_URL, { timeout: 15000 }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        clearTimeout(timeout);
        const redirectUrl = res.headers.location;
        logger.info(`BCU URL redirected to: ${redirectUrl}`);

        https.get(redirectUrl, { timeout: 15000 }, (redirectRes) => {
          let data = '';
          redirectRes.on('data', (chunk) => { data += chunk; });
          redirectRes.on('end', () => {
            clearTimeout(timeout);
            resolve(data);
          });
        }).on('error', (error) => {
          clearTimeout(timeout);
          reject(error);
        });
        return;
      }

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        clearTimeout(timeout);
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`BCU website returned status code ${res.statusCode}`));
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Parse BCU HTML to extract exchange rates
 * @param {string} html - HTML content from BCU
 * @returns {Object} Parsed exchange rates
 */
function parseBcuRates(html) {
  const $ = cheerio.load(html);
  const rates = {};

  // Map of BCU currency names to our model keys
  const currencyMap = {
    'DLS. USA BILLETE': 'usdBillete',
    'DLS. USA CABLE': 'usdCable',
    'DLS.PROMED.FONDO': 'usdPromedio',
    'PESO ARG.BILLETE': 'ars',
    'REAL BILLETE': 'brl',
    'UNIDAD INDEXADA': 'ui',
    'UNIDAD PREVISIONAL': 'up',
    'UNIDAD REAJUSTAB': 'ur'
  };

  // Find all table rows in tbody
  $('tbody tr').each((index, element) => {
    const $row = $(element);
    const cells = $row.find('td');

    if (cells.length >= 5) {
      const moneda = $(cells[0]).text().trim();
      const fecha = $(cells[1]).text().trim();
      const venta = parseFloat($(cells[2]).text().trim().replace(',', '.'));
      const compra = parseFloat($(cells[3]).text().trim().replace(',', '.'));
      const arbitraje = parseFloat($(cells[4]).text().trim().replace(',', '.'));

      // Check if this is a currency we're tracking
      const modelKey = currencyMap[moneda];
      if (modelKey) {
        rates[modelKey] = {
          venta: isNaN(venta) ? 0 : venta,
          compra: isNaN(compra) ? 0 : compra,
          arbitraje: isNaN(arbitraje) ? 0 : arbitraje,
          fecha
        };
      }
    }
  });

  // Validate we got all expected currencies
  const expectedKeys = Object.values(currencyMap);
  const missingKeys = expectedKeys.filter(key => !rates[key]);

  if (missingKeys.length > 0) {
    logger.warn(`BCU parsing: Missing currencies: ${missingKeys.join(', ')}`);
  }

  if (Object.keys(rates).length === 0) {
    throw new Error('No exchange rates found in BCU HTML - website structure may have changed');
  }

  return rates;
}

/**
 * Sync exchange rates from BCU
 * Main function that orchestrates fetching, parsing, and updating database
 * @returns {Promise<Object>} Updated BcuRates document
 */
export async function syncBcuRates() {
  logger.info('Starting BCU rates synchronization...');

  try {
    // Step 1: Fetch HTML from BCU
    logger.info('Fetching HTML from BCU website...');
    const html = await fetchBcuHtml();
    logger.info('Successfully fetched BCU HTML');

    // Step 2: Parse rates from HTML
    logger.info('Parsing exchange rates from HTML...');
    const rates = parseBcuRates(html);
    logger.info(`Successfully parsed ${Object.keys(rates).length} exchange rates`);

    // Step 3: Update BcuRates model in database
    logger.info('Updating BcuRates in database...');
    const updatedRates = await BcuRates.updateRates(rates, true);
    logger.info('Successfully updated BcuRates in database');

    // Step 4: Update PricingSettings.usdToUyu with DLS. USA BILLETE
    if (rates.usdBillete && rates.usdBillete.venta > 0) {
      logger.info(`Updating PricingSettings.usdToUyu to ${rates.usdBillete.venta}`);
      await PricingSettings.updateSettings({
        usdToUyu: rates.usdBillete.venta
      });
      logger.info('Successfully updated PricingSettings.usdToUyu');
    }

    logger.info('BCU rates synchronization completed successfully');
    return updatedRates;

  } catch (error) {
    logger.error('BCU rates synchronization failed:', error);

    // Update BcuRates with error status
    try {
      await BcuRates.updateRates(null, false, error.message);
    } catch (updateError) {
      logger.error('Failed to update BcuRates error status:', updateError);
    }

    throw error;
  }
}

/**
 * Get current BCU rates from database
 * @returns {Promise<Object>} Current rates
 */
export async function getCurrentRates() {
  try {
    const bcuRates = await BcuRates.getSettings();
    return bcuRates.getAllRates();
  } catch (error) {
    logger.error('Error getting current BCU rates:', error);
    throw error;
  }
}

/**
 * Check if BCU rates need update
 * @returns {Promise<Boolean>} True if rates need update
 */
export async function needsUpdate() {
  try {
    const bcuRates = await BcuRates.getSettings();

    // If never updated, needs update
    if (!bcuRates.lastSuccessfulUpdate) {
      return true;
    }

    // Check if last update was more than 24 hours ago
    const now = new Date();
    const hoursSinceUpdate = (now - bcuRates.lastSuccessfulUpdate) / (1000 * 60 * 60);

    return hoursSinceUpdate >= 24;
  } catch (error) {
    logger.error('Error checking if BCU rates need update:', error);
    return true; // Assume needs update on error
  }
}
