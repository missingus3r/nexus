import https from 'https';
import * as cheerio from 'cheerio';
import logger from '../utils/logger.js';

const DGI_URL = 'https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/unidad-reajustable-ur';

/**
 * Fetch HTML content from DGI website
 * @returns {Promise<string>} HTML content
 */
function fetchDgiHtml() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout - DGI website did not respond in time'));
    }, 15000); // 15 second timeout

    https.get(DGI_URL, { timeout: 15000 }, (res) => {
      // Follow redirects
      if (res.statusCode === 301 || res.statusCode === 302) {
        clearTimeout(timeout);
        const redirectUrl = res.headers.location;
        logger.info(`DGI URL redirected to: ${redirectUrl}`);

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
          reject(new Error(`DGI website returned status code ${res.statusCode}`));
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Parse DGI HTML to extract UR (Unidad Reajustable) value
 * @param {string} html - HTML content from DGI
 * @returns {Object} Parsed UR value
 */
function parseDgiUrValue(html) {
  const $ = cheerio.load(html);

  // Get current year and month
  const now = new Date();
  const currentYear = now.getFullYear();
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Setiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const currentMonth = monthNames[now.getMonth()];

  logger.info(`Looking for UR value for ${currentMonth} ${currentYear}`);

  let urValue = null;

  // Find table with caption matching current year
  $('table.Table').each((index, tableElement) => {
    const caption = $(tableElement).find('caption').text().trim();

    // Check if caption contains current year
    if (caption.includes(currentYear.toString())) {
      logger.info(`Found table for year: ${caption}`);

      // Find the row with current month
      $(tableElement).find('tbody tr').each((rowIndex, rowElement) => {
        const $row = $(rowElement);
        const cells = $row.find('td');

        if (cells.length >= 2) {
          const month = $(cells[0]).text().trim();
          const value = $(cells[1]).text().trim();

          // Check if this row matches current month
          if (month === currentMonth && value && value !== '&nbsp;') {
            // Parse value: "1.839,08" -> 1839.08
            urValue = parseFloat(value.replace(/\./g, '').replace(',', '.'));
            logger.info(`Found UR value for ${currentMonth}: ${urValue}`);
          }
        }
      });
    }
  });

  if (!urValue || isNaN(urValue)) {
    throw new Error(`No UR value found for ${currentMonth} ${currentYear} - value may not be published yet`);
  }

  return {
    ur: {
      venta: urValue,
      compra: 0, // UR typically doesn't have a buy rate
      arbitraje: 0,
      fecha: new Date().toISOString().split('T')[0]
    }
  };
}

/**
 * Sync UR (Unidad Reajustable) value from DGI
 * @returns {Promise<Object>} Parsed UR value
 */
export async function syncDgiRates() {
  logger.info('Starting DGI UR synchronization...');

  try {
    // Step 1: Fetch HTML from DGI
    logger.info('Fetching HTML from DGI website...');
    const html = await fetchDgiHtml();
    logger.info('Successfully fetched DGI HTML');

    // Step 2: Parse UR value from HTML
    logger.info('Parsing UR value from HTML...');
    const urData = parseDgiUrValue(html);
    logger.info(`Successfully parsed UR value: ${urData.ur.venta}`);

    return urData;

  } catch (error) {
    logger.error('DGI UR synchronization failed:', error);
    throw error;
  }
}

/**
 * Get current UR value from DGI
 * @returns {Promise<Object>} Current UR value
 */
export async function getDgiUrValue() {
  return await syncDgiRates();
}
