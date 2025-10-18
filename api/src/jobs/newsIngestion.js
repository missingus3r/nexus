import axios from 'axios';
import * as cheerio from 'cheerio';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import crypto from 'crypto';
import nlp from 'compromise';
import { NewsEvent } from '../models/index.js';
import { geocode } from '../services/geoService.js';
import logger from '../utils/logger.js';
import { emitNewsAdded } from '../sockets/eventHandlers.js';

const parseXml = promisify(parseString);

// News source configurations
const NEWS_SOURCES = [
  {
    name: 'El País',
    rssUrl: 'https://www.elpais.com.uy/rss/seccion/policiales',
    type: 'rss'
  },
  {
    name: 'El Observador',
    rssUrl: 'https://www.elobservador.com.uy/rss/seccion/policiales',
    type: 'rss'
  }
  // Add more sources as needed
];

// Category classification keywords
const CATEGORY_KEYWORDS = {
  homicidio: ['homicidio', 'asesinato', 'mató', 'muerto', 'fallecido', 'homicida'],
  rapiña: ['rapiña', 'asalto', 'atraco', 'robo violento', 'copamiento'],
  hurto: ['hurto', 'robo', 'sustracción', 'robaron'],
  copamiento: ['copamiento', 'secuestro', 'rehén', 'retén'],
  violencia_domestica: ['violencia doméstica', 'femicidio', 'violencia de género'],
  narcotrafico: ['narcotráfico', 'droga', 'cocaína', 'marihuana', 'pasta base']
};

/**
 * Classify article category based on content
 * @param {String} text - Article text
 * @returns {String} Category
 */
function classifyCategory(text) {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        return category;
      }
    }
  }

  return 'otro';
}

/**
 * Extract place names from text using NLP
 * @param {String} text - Article text
 * @returns {Array} Array of place names
 */
function extractPlaces(text) {
  const doc = nlp(text);
  const places = doc.places().out('array');

  // Also look for Uruguayan neighborhoods/cities specifically
  const uruguayanPlaces = [
    'montevideo', 'ciudad vieja', 'pocitos', 'carrasco', 'malvín',
    'punta gorda', 'cordón', 'centro', 'goes', 'la teja', 'cerro',
    'canelones', 'maldonado', 'punta del este', 'salto', 'paysandú',
    'rivera', 'tacuarembó', 'durazno', 'florida', 'rocha'
  ];

  const lowerText = text.toLowerCase();
  const foundPlaces = uruguayanPlaces.filter(place => lowerText.includes(place));

  return [...new Set([...places, ...foundPlaces])];
}

/**
 * Generate deduplication key from article data
 * @param {String} title
 * @param {Date} date
 * @param {Object} location
 * @returns {String} SHA-256 hash
 */
function generateDedupKey(title, date, location) {
  const normalized = title.toLowerCase().replace(/\s+/g, ' ').trim();
  const dateStr = date.toISOString().slice(0, 10);
  const locStr = location ? `${location.coordinates[0].toFixed(3)},${location.coordinates[1].toFixed(3)}` : 'unknown';
  const combined = `${normalized}|${dateStr}|${locStr}`;

  return crypto.createHash('sha256').update(combined).digest('hex');
}

/**
 * Parse RSS feed
 * @param {String} url - RSS feed URL
 * @returns {Array} Array of articles
 */
async function parseRssFeed(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Nexus-UY/1.0'
      },
      timeout: 10000
    });

    const result = await parseXml(response.data);
    const items = result.rss?.channel?.[0]?.item || [];

    return items.map(item => ({
      title: item.title?.[0] || '',
      link: item.link?.[0] || '',
      description: item.description?.[0] || '',
      pubDate: item.pubDate?.[0] ? new Date(item.pubDate[0]) : new Date()
    }));
  } catch (error) {
    logger.error('Error parsing RSS feed:', { url, error: error.message });
    return [];
  }
}

/**
 * Fetch and parse HTML article
 * @param {String} url - Article URL
 * @returns {String} Article text
 */
async function fetchArticleContent(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Nexus-UY/1.0'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);

    // Try common article selectors
    let text = $('article').text() ||
               $('.article-content').text() ||
               $('.post-content').text() ||
               $('main').text();

    return text.trim();
  } catch (error) {
    logger.error('Error fetching article:', { url, error: error.message });
    return '';
  }
}

/**
 * Process a single article
 * @param {Object} article - Article data
 * @param {String} sourceName - News source name
 * @param {SocketIO.Server} io - Socket.IO instance
 * @returns {Object} Processed news event or null
 */
async function processArticle(article, sourceName, io) {
  try {
    const startTime = Date.now();

    // Fetch full article content
    const fullText = await fetchArticleContent(article.link);
    const combinedText = `${article.title} ${article.description} ${fullText}`;

    // Classify category
    const category = classifyCategory(combinedText);

    // Extract places
    const places = extractPlaces(combinedText);
    if (places.length === 0) {
      logger.warn('No places found in article', { url: article.link });
      return null;
    }

    // Geocode the first place
    const primaryPlace = places[0];
    const geoResult = await geocode(primaryPlace);

    if (!geoResult) {
      logger.warn('Geocoding failed', { place: primaryPlace, url: article.link });
      return null;
    }

    const location = {
      type: 'Point',
      coordinates: [geoResult.lon, geoResult.lat]
    };

    // Generate deduplication key
    const dedupKey = generateDedupKey(article.title, article.pubDate, location);

    // Check if already exists
    const existing = await NewsEvent.findOne({ dedupKey });
    if (existing) {
      logger.info('Duplicate article skipped', { url: article.link });
      return null;
    }

    // Create news event
    const newsEvent = await NewsEvent.create({
      title: article.title,
      source: sourceName,
      url: article.link,
      category,
      location,
      locationName: geoResult.displayName,
      date: article.pubDate,
      confidence: 0.7, // Base confidence
      dedupKey,
      excerpt: article.description,
      entities: places.map(p => ({
        text: p,
        type: 'PLACE',
        confidence: 0.8
      })),
      metadata: {
        fetchedAt: new Date(),
        processingTime: Date.now() - startTime,
        geocodingMethod: 'nominatim'
      }
    });

    logger.info('News event created', {
      id: newsEvent._id,
      title: newsEvent.title,
      category: newsEvent.category
    });

    // Emit socket event
    if (io) {
      emitNewsAdded(io, newsEvent.toGeoJSON());
    }

    return newsEvent;
  } catch (error) {
    logger.error('Error processing article:', {
      url: article.link,
      error: error.message
    });
    return null;
  }
}

/**
 * Run news ingestion job
 * @param {SocketIO.Server} io - Socket.IO instance
 */
export async function runNewsIngestion(io) {
  logger.info('Starting news ingestion job');
  const startTime = Date.now();

  let totalProcessed = 0;
  let totalCreated = 0;
  let totalFailed = 0;

  for (const source of NEWS_SOURCES) {
    try {
      logger.info('Processing news source', { source: source.name });

      const articles = await parseRssFeed(source.rssUrl);
      logger.info(`Found ${articles.length} articles from ${source.name}`);

      for (const article of articles) {
        totalProcessed++;
        const result = await processArticle(article, source.name, io);

        if (result) {
          totalCreated++;
        } else {
          totalFailed++;
        }

        // Rate limit: 1 request per second to geocoding API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      logger.error('Error processing news source:', {
        source: source.name,
        error: error.message
      });
    }
  }

  const duration = Date.now() - startTime;
  logger.info('News ingestion completed', {
    totalProcessed,
    totalCreated,
    totalFailed,
    durationMs: duration
  });

  return {
    totalProcessed,
    totalCreated,
    totalFailed,
    durationMs: duration
  };
}
