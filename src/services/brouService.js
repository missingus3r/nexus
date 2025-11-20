import https from 'https';
import * as cheerio from 'cheerio';
import BcuRates from '../models/BcuRates.js';
import PricingSettings from '../models/PricingSettings.js';
import logger from '../utils/logger.js';

const BROU_URL = 'https://www.brou.com.uy/cotizaciones';

/**
 * Fetch HTML content from BROU website
 * @returns {Promise<string>} HTML content
 */
function fetchBrouHtml() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout - BROU website did not respond in time'));
    }, 15000); // 15 second timeout

    https.get(BROU_URL, { timeout: 15000 }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        clearTimeout(timeout);
        const redirectUrl = res.headers.location;
        logger.info(`BROU URL redirected to: ${redirectUrl}`);

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
          reject(new Error(`BROU website returned status code ${res.statusCode}`));
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Parse BROU HTML to extract exchange rates
 * @param {string} html - HTML content from BROU
 * @returns {Object} Parsed exchange rates
 */
function parseBrouRates(html) {
  const $ = cheerio.load(html);
  const rates = {};

  // Map of BROU currency names to our model keys
  const currencyMap = {
    'Dólar eBROU': 'usdBillete',
    'Dólar': 'usdBillete',  // Fallback if eBROU not found
    'Euro': 'eur',
    'Peso Argentino': 'ars',
    'Real': 'brl',
    'Libra Esterlina': 'gbp',
    'Franco Suizo': 'chf',
    'Unidad Indexada': 'ui'
  };

  // Find all table rows in tbody
  $('tbody tr').each((index, element) => {
    const $row = $(element);
    const cells = $row.find('td');

    if (cells.length >= 5) {
      // Extract currency name from first cell
      const moneda = $(cells[0]).find('p.moneda').text().trim();

      // Extract values from cells with class "valor"
      const valores = [];
      $row.find('p.valor').each((i, el) => {
        const text = $(el).text().trim();
        if (text && text !== '-') {
          valores.push(text);
        }
      });

      // Check if this is a currency we're tracking
      const modelKey = currencyMap[moneda];
      if (modelKey && valores.length >= 2) {
        // For BROU: valores[0] = compra, valores[1] = venta
        const compra = parseFloat(valores[0].replace(/\./g, '').replace(',', '.'));
        const venta = parseFloat(valores[1].replace(/\./g, '').replace(',', '.'));

        // Calculate arbitraje (spread)
        const arbitraje = !isNaN(venta) && !isNaN(compra) ? venta - compra : 0;

        // Only update if we haven't seen this currency yet, or if it's "Dólar eBROU" (preferred over regular "Dólar")
        if (!rates[modelKey] || moneda === 'Dólar eBROU') {
          rates[modelKey] = {
            venta: isNaN(venta) ? 0 : venta,
            compra: isNaN(compra) ? 0 : compra,
            arbitraje: isNaN(arbitraje) ? 0 : arbitraje,
            fecha: new Date().toISOString().split('T')[0] // Use current date
          };

          logger.info(`Parsed ${moneda}: Compra=${compra}, Venta=${venta}`);
        }
      }
    }
  });

  // Validate we got key currencies
  const requiredKeys = ['usdBillete', 'eur', 'ars', 'brl'];
  const missingKeys = requiredKeys.filter(key => !rates[key]);

  if (missingKeys.length > 0) {
    logger.warn(`BROU parsing: Missing required currencies: ${missingKeys.join(', ')}`);
  }

  if (Object.keys(rates).length === 0) {
    throw new Error('No exchange rates found in BROU HTML - website structure may have changed');
  }

  return rates;
}

/**
 * Sync exchange rates from BROU
 * Main function that orchestrates fetching, parsing, and updating database
 * @returns {Promise<Object>} Parsed rates from BROU
 */
export async function syncBrouRates() {
  logger.info('Starting BROU rates synchronization...');

  try {
    // Step 1: Fetch HTML from BROU
    logger.info('Fetching HTML from BROU website...');
    const html = await fetchBrouHtml();
    logger.info('Successfully fetched BROU HTML');

    // Step 2: Parse rates from HTML
    logger.info('Parsing exchange rates from HTML...');
    const rates = parseBrouRates(html);
    logger.info(`Successfully parsed ${Object.keys(rates).length} exchange rates from BROU`);

    return rates;

  } catch (error) {
    logger.error('BROU rates synchronization failed:', error);
    throw error;
  }
}

/**
 * Get current exchange rates from BROU
 * @returns {Promise<Object>} Current rates
 */
export async function getBrouRates() {
  return await syncBrouRates();
}
