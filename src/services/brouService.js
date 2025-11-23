import https from 'https';
import * as cheerio from 'cheerio';
import BcuRates from '../models/BcuRates.js';
import PricingSettings from '../models/PricingSettings.js';
import logger from '../utils/logger.js';

const BROU_URL = process.env.BROU_COTIZACIONES_URL || 'https://www.brou.com.uy/cotizaciones';

/**
 * Fetch HTML content from BROU portlet
 * @returns {Promise<string>} HTML content
 */
function fetchBrouHtml() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout - BROU website did not respond in time'));
    }, 15000); // 15 second timeout

    const options = {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Node.js'
      }
    };

    logger.info(`Fetching BROU from: ${BROU_URL}`);

    https.get(BROU_URL, options, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        clearTimeout(timeout);
        const redirectUrl = res.headers.location;
        logger.info(`BROU URL redirected to: ${redirectUrl}`);

        https.get(redirectUrl, options, (redirectRes) => {
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
 * Parse BROU portlet HTML to extract exchange rates
 * @param {string} html - HTML content from BROU portlet
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

  // Buscar el div.caja.full cuyo h3 diga "Cotizaciones"
  let tablaCotizaciones = null;

  $('div.caja.full').each((index, divElement) => {
    const $div = $(divElement);
    const h3Text = $div.find('h3').first().text().trim();

    if (h3Text === 'Cotizaciones') {
      tablaCotizaciones = $div.find('table').first();
      logger.info('Found Cotizaciones table in portlet');
      return false; // break the loop
    }
  });

  if (!tablaCotizaciones || tablaCotizaciones.length === 0) {
    logger.error('Could not find Cotizaciones table in BROU portlet');
    logger.debug('HTML preview:', html.substring(0, 500));
    throw new Error('No se encontró la tabla de "Cotizaciones" en el HTML del portlet');
  }

  // Helper function to get cell value
  function getValor(cell) {
    if (!cell) return null;
    const text = $(cell).text().trim();
    if (!text || text === '-') return null;
    return text;
  }

  // Recorrer las filas de la tabla
  tablaCotizaciones.find('tr').each((index, row) => {
    const cells = $(row).find('td');

    // Según el HTML del portlet:
    // 0: Moneda
    // 2: Compra
    // 4: Venta
    // 6: Arbitraje Compra
    // 8: Arbitraje Venta
    if (cells.length < 9) return; // skip this row

    const moneda = $(cells[0]).text().trim();
    if (!moneda) return; // skip if no currency name

    const compraText = getValor(cells[2]);
    const ventaText = getValor(cells[4]);
    const arbitrajeCompraText = getValor(cells[6]);
    const arbitrajeVentaText = getValor(cells[8]);

    // Check if this is a currency we're tracking
    const modelKey = currencyMap[moneda];

    if (modelKey && compraText && ventaText) {
      // Parse values (format: "1.234,56" -> 1234.56)
      const compra = parseFloat(compraText.replace(/\./g, '').replace(',', '.'));
      const venta = parseFloat(ventaText.replace(/\./g, '').replace(',', '.'));

      // Calculate arbitraje (spread)
      const arbitraje = !isNaN(venta) && !isNaN(compra) ? venta - compra : 0;

      // Only update if we haven't seen this currency yet, or if it's "Dólar eBROU" (preferred)
      if (!rates[modelKey] || moneda === 'Dólar eBROU') {
        rates[modelKey] = {
          venta: isNaN(venta) ? 0 : venta,
          compra: isNaN(compra) ? 0 : compra,
          arbitraje: isNaN(arbitraje) ? 0 : arbitraje,
          fecha: new Date().toISOString().split('T')[0]
        };

        logger.info(`Parsed ${moneda}: Compra=${compra}, Venta=${venta}, Arbitraje=${arbitraje}`);
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
    throw new Error('No exchange rates found in BROU portlet HTML - website structure may have changed');
  }

  logger.info(`Successfully parsed ${Object.keys(rates).length} currencies from BROU portlet`);
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
