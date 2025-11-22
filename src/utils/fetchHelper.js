import https from 'https';
import http from 'http';
import logger from './logger.js';

/**
 * Fetch with timeout
 * @param {string} url - URL to fetch
 * @param {number} timeoutMs - Timeout in milliseconds (default 5000)
 * @returns {Promise<Object>} - Parsed JSON response
 */
export async function fetchWithTimeout(url, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    let timeoutHandle = null;

    const req = protocol.get(url, (res) => {
      // Clear timeout on response
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }

      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      // Clear timeout on error
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      reject(error);
    });

    // Set timeout AFTER request is created
    timeoutHandle = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout'));
    }, timeoutMs);
  });
}
