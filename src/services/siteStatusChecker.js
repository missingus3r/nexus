import https from 'https';
import http from 'http';
import { URL } from 'url';
import externalSites, { getAllExternalSites } from '../data/external-sites.js';

/**
 * Site Status Checker Service
 * Verifies the availability of external sites by making HEAD requests
 */

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_REDIRECTS = 5;

/**
 * Check if a URL is accessible
 * @param {string} url - The URL to check
 * @param {number} timeout - Request timeout in milliseconds
 * @param {number} redirectCount - Current redirect count
 * @returns {Promise<Object>} Status object with details
 */
export const checkSiteStatus = (url, timeout = DEFAULT_TIMEOUT, redirectCount = 0) => {
  return new Promise((resolve) => {
    try {
      const parsedUrl = new URL(url);
      const protocol = parsedUrl.protocol === 'https:' ? https : http;

      const options = {
        method: 'HEAD',
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname + parsedUrl.search,
        timeout: timeout,
        headers: {
          'User-Agent': 'Vortex-SiteChecker/1.0 (External Site Monitor)',
          'Accept': '*/*'
        }
      };

      const startTime = Date.now();

      const req = protocol.request(options, (res) => {
        const responseTime = Date.now() - startTime;

        // Handle redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          if (redirectCount >= MAX_REDIRECTS) {
            resolve({
              online: false,
              statusCode: res.statusCode,
              responseTime,
              error: 'Too many redirects',
              redirectTo: res.headers.location,
              checkedAt: new Date().toISOString()
            });
            return;
          }

          // Follow redirect
          const redirectUrl = new URL(res.headers.location, url).href;
          checkSiteStatus(redirectUrl, timeout, redirectCount + 1)
            .then(result => resolve({
              ...result,
              originalUrl: url,
              redirected: true
            }));
          return;
        }

        resolve({
          online: res.statusCode >= 200 && res.statusCode < 400,
          statusCode: res.statusCode,
          responseTime,
          statusMessage: res.statusMessage,
          checkedAt: new Date().toISOString()
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          online: false,
          error: 'Request timeout',
          timeout: true,
          checkedAt: new Date().toISOString()
        });
      });

      req.on('error', (err) => {
        resolve({
          online: false,
          error: err.message,
          errorCode: err.code,
          checkedAt: new Date().toISOString()
        });
      });

      req.end();

    } catch (error) {
      resolve({
        online: false,
        error: error.message,
        invalidUrl: true,
        checkedAt: new Date().toISOString()
      });
    }
  });
};

/**
 * Check status of multiple sites with concurrency control
 * @param {Array} sites - Array of site objects with url property
 * @param {number} concurrency - Number of concurrent requests
 * @returns {Promise<Array>} Array of results
 */
export const checkMultipleSites = async (sites, concurrency = 10) => {
  const results = [];
  const queue = [...sites];

  const checkNext = async () => {
    if (queue.length === 0) return;

    const site = queue.shift();
    const status = await checkSiteStatus(site.url);

    results.push({
      ...site,
      status
    });

    return checkNext();
  };

  // Start concurrent workers
  const workers = Array(Math.min(concurrency, sites.length))
    .fill(null)
    .map(() => checkNext());

  await Promise.all(workers);

  return results;
};

/**
 * Check all external sites organized by section
 * @param {number} concurrency - Number of concurrent requests
 * @returns {Promise<Object>} Results organized by section
 */
export const checkAllExternalSites = async (concurrency = 10) => {
  const startTime = Date.now();
  const allSites = getAllExternalSites();

  const results = await checkMultipleSites(allSites, concurrency);

  const totalTime = Date.now() - startTime;

  // Organize by section
  const bySectionKey = {};
  results.forEach(result => {
    if (!bySectionKey[result.sectionKey]) {
      bySectionKey[result.sectionKey] = {
        section: result.section,
        sites: []
      };
    }
    bySectionKey[result.sectionKey].sites.push(result);
  });

  // Calculate statistics
  const stats = {
    total: results.length,
    online: results.filter(r => r.status.online).length,
    offline: results.filter(r => r.status.online === false).length,
    errors: results.filter(r => r.status.error).length,
    totalCheckTime: totalTime,
    averageResponseTime: Math.round(
      results
        .filter(r => r.status.responseTime)
        .reduce((sum, r) => sum + r.status.responseTime, 0) /
      results.filter(r => r.status.responseTime).length
    )
  };

  return {
    stats,
    sections: bySectionKey,
    checkedAt: new Date().toISOString()
  };
};

/**
 * Check sites in a specific section
 * @param {string} sectionKey - Section key to check
 * @param {number} concurrency - Number of concurrent requests
 * @returns {Promise<Object>} Results for the section
 */
export const checkSectionSites = async (sectionKey, concurrency = 10) => {
  const section = externalSites[sectionKey];

  if (!section) {
    throw new Error(`Section '${sectionKey}' not found`);
  }

  const sitesWithSection = section.sites.map(site => ({
    ...site,
    section: section.name,
    sectionKey
  }));

  const results = await checkMultipleSites(sitesWithSection, concurrency);

  const stats = {
    total: results.length,
    online: results.filter(r => r.status.online).length,
    offline: results.filter(r => r.status.online === false).length,
    errors: results.filter(r => r.status.error).length
  };

  return {
    section: section.name,
    description: section.description,
    stats,
    sites: results,
    checkedAt: new Date().toISOString()
  };
};

/**
 * Get a quick summary of all sites (only counts, no actual checks)
 * @returns {Object} Summary statistics
 */
export const getSiteSummary = () => {
  const allSites = getAllExternalSites();

  const bySection = {};
  allSites.forEach(site => {
    if (!bySection[site.sectionKey]) {
      bySection[site.sectionKey] = {
        name: site.section,
        count: 0
      };
    }
    bySection[site.sectionKey].count++;
  });

  return {
    totalSites: allSites.length,
    sections: bySection
  };
};

export default {
  checkSiteStatus,
  checkMultipleSites,
  checkAllExternalSites,
  checkSectionSites,
  getSiteSummary
};
