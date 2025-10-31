import { chromium } from 'playwright';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  OUTPUT_SCHEMA,
  PRICE_REGEX,
  FREQUENCY_HINTS,
  LOCATION_HINT_CLASSES,
  CANDIDATE_CARD_SELECTORS,
  CANDIDATE_PRICE_SELECTORS,
  CANDIDATE_TITLE_SELECTORS,
  DOMAIN_OVERRIDES,
  OPERATION_HINTS,
} from '../config/realEstateScraperConfig.js';
import { loadScrapingSources } from '../utils/realEstateSourceLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const OUTPUT_DIR = path.join(ROOT_DIR, 'data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'real_estate_offers.json');

const DEFAULT_SCRAPER_OPTIONS = {
  maxOffersPerSource: Number(process.env.MAX_OFFERS_PER_SOURCE ?? 40),
  navigationTimeout: Number(process.env.SCRAPER_NAV_TIMEOUT ?? 45000),
  waitAfterLoadMs: Number(process.env.SCRAPER_WAIT_AFTER_LOAD ?? 3000),
  userAgent:
    process.env.SCRAPER_USER_AGENT ??
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
};

const LOCATION_KEYWORDS = [
  'montevideo',
  'maldonado',
  'canelones',
  'salto',
  'colonia',
  'rivera',
  'florida',
  'artigas',
  'durazno',
  'flores',
  'san jose',
  'treinta y tres',
  'rocha',
  'soriano',
  'lavalleja',
  'tacuarembo',
  'rio negro',
  'paysandu',
  'cerro largo',
  'piriapolis',
  'punta del este',
  'punta',
  'atlantida',
  'la floresta',
  'costa',
  'ciudad',
  'barrio',
  'departamento',
];

function resolveOverride(domain) {
  if (DOMAIN_OVERRIDES[domain]) {
    return DOMAIN_OVERRIDES[domain];
  }
  if (domain.startsWith('www.')) {
    return DOMAIN_OVERRIDES[domain.slice(4)] ?? {};
  }
  return DOMAIN_OVERRIDES[`www.${domain}`] ?? {};
}

function sanitizeText(text) {
  if (!text) {
    return null;
  }
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : null;
}

function absolutizeUrl(candidate, base) {
  if (!candidate) {
    return null;
  }
  try {
    return new URL(candidate, base).href;
  } catch {
    return candidate;
  }
}

function detectCurrency(priceText) {
  if (!priceText) {
    return null;
  }
  const upper = priceText.toUpperCase();
  if (/(U\$S|USD|US\$|DOLARES?|DÓLARES?)/.test(upper)) {
    return 'USD';
  }
  if (/(U\$|UYU|\$U|PESOS? URUGUAYOS?)/.test(upper)) {
    return 'UYU';
  }
  if (/(EUR|€)/.test(upper)) {
    return 'EUR';
  }
  if (/\$/.test(upper)) {
    return 'USD';
  }
  return null;
}

function normaliseNumericString(raw) {
  if (!raw) {
    return null;
  }
  let digits = raw.replace(/[^\d.,]/g, '');
  if (!digits) {
    return null;
  }

  const commaCount = (digits.match(/,/g) ?? []).length;
  const dotCount = (digits.match(/\./g) ?? []).length;

  if (commaCount && dotCount) {
    if (digits.lastIndexOf(',') > digits.lastIndexOf('.')) {
      digits = digits.replace(/\./g, '').replace(',', '.');
    } else {
      digits = digits.replace(/,/g, '');
    }
  } else if (commaCount && !dotCount) {
    digits = digits.replace(',', '.');
  } else if (dotCount > 1 && !commaCount) {
    const parts = digits.split('.');
    const last = parts.pop();
    digits = `${parts.join('')}.${last}`;
  } else {
    digits = digits.replace(/,/g, '');
  }

  return digits;
}

function parseAmount(priceText) {
  if (!priceText) {
    return null;
  }
  const matches = priceText.match(/\d[\d.,]*/);
  if (!matches) {
    return null;
  }
  const normalised = normaliseNumericString(matches[0]);
  const parsed = normalised ? Number.parseFloat(normalised) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function detectFrequency(priceText, details, hintedFrequency) {
  if (hintedFrequency) {
    return hintedFrequency;
  }
  const haystack = [priceText, ...(details ?? [])].filter(Boolean).join(' ').toLowerCase();
  for (const { match, label } of FREQUENCY_HINTS) {
    if (match.test(haystack)) {
      return label;
    }
  }
  return null;
}

function inferOperation(defaultOperation, url, rawTexts, hintedOperation) {
  if (hintedOperation) {
    return hintedOperation;
  }
  if (defaultOperation) {
    return defaultOperation;
  }
  const combined = [url, ...(rawTexts ?? [])].filter(Boolean).join(' ').toLowerCase();
  for (const [operation, patterns] of Object.entries(OPERATION_HINTS)) {
    if (patterns.some((pattern) => pattern.test(combined))) {
      return operation;
    }
  }
  return null;
}

function pickLocation(locationText, details) {
  if (locationText) {
    return locationText;
  }
  if (!details?.length) {
    return null;
  }
  const normalizedDetails = details.map((item) =>
    item
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase(),
  );
  for (let index = 0; index < normalizedDetails.length; index += 1) {
    const normalized = normalizedDetails[index];
    if (LOCATION_KEYWORDS.some((keyword) => normalized.includes(keyword))) {
      return details[index];
    }
  }
  return null;
}

function cloneSchema(overrides = {}) {
  return {
    ...structuredClone(OUTPUT_SCHEMA),
    ...overrides,
  };
}

function convertRawOffer(rawOffer, source) {
  const price = {
    amount: parseAmount(rawOffer.priceText),
    currency: detectCurrency(rawOffer.priceText),
    frequency: detectFrequency(rawOffer.priceText, rawOffer.detailTexts, rawOffer.frequencyHint),
    raw: sanitizeText(rawOffer.priceText),
  };

  const gallery = (rawOffer.gallery ?? [])
    .map((entry) => sanitizeText(entry))
    .filter(Boolean)
    .map((entry) => absolutizeUrl(entry, source.url));

  const normalized = cloneSchema({
    title: sanitizeText(rawOffer.title),
    url: rawOffer.link,
    image: absolutizeUrl(rawOffer.image, source.url),
    gallery,
    price,
    operation: inferOperation(source.operation, source.url, [
      rawOffer.priceText,
      ...(rawOffer.detailTexts ?? []),
      ...(rawOffer.snippet ?? []),
    ], rawOffer.operationHint),
    location: pickLocation(sanitizeText(rawOffer.locationText), rawOffer.detailTexts),
    year: rawOffer.year ?? null,
    details: (rawOffer.detailTexts ?? []).map(sanitizeText).filter(Boolean),
    description: sanitizeText(rawOffer.snippet?.join(' ')),
    sourceUrl: source.url,
    sourceDomain: source.domain,
  });

  return normalized;
}

function uniqueByUrl(offers) {
  const map = new Map();
  for (const offer of offers) {
    if (!offer.url) {
      continue;
    }
    if (!map.has(offer.url)) {
      map.set(offer.url, offer);
    }
  }
  return Array.from(map.values());
}

async function dismissCookieBanners(page) {
  const candidateSelectors = [
    'button:has-text("Aceptar")',
    'button:has-text("ACEPTAR")',
    'button:has-text("Acepto")',
    'button:has-text("Entendido")',
    'button:has-text("Cerrar")',
    'button:has-text("Ok")',
    'button:has-text("De acuerdo")',
    'button:has-text("I agree")',
    'button:has-text("Got it")',
    '[aria-label*="Aceptar"]',
    '[class*="cookie"] button',
  ];

  for (const selector of candidateSelectors) {
    try {
      const button = await page.waitForSelector(selector, { timeout: 1500 });
      if (button) {
        await button.click().catch(() => {});
        break;
      }
    } catch {
      // Ignore missing banner.
    }
  }
}

function buildEvaluationSettings(source, config) {
  const override = resolveOverride(source.domain);

  const cardSelectors = Array.from(
    new Set([...(override.cardSelectors ?? []), ...CANDIDATE_CARD_SELECTORS]),
  );

  const priceSelectors = Array.from(
    new Set([...(override.priceSelectors ?? []), ...CANDIDATE_PRICE_SELECTORS]),
  );

  const titleSelectors = Array.from(
    new Set([...(override.titleSelectors ?? []), ...CANDIDATE_TITLE_SELECTORS]),
  );

  const locationSelectors = Array.from(
    new Set([...(override.locationSelectors ?? []), ...LOCATION_HINT_CLASSES]),
  );

  const frequencyHints = FREQUENCY_HINTS.map(({ match, label }) => ({
    pattern: match.source,
    flags: match.flags,
    label,
  }));

  const operationHints = Object.fromEntries(
    Object.entries(OPERATION_HINTS).map(([operation, patterns]) => [
      operation,
      patterns.map((pattern) => ({ pattern: pattern.source, flags: pattern.flags })),
    ]),
  );

  return {
    maxOffers: config.maxOffersPerSource,
    cardSelectors,
    priceSelectors,
    titleSelectors,
    locationSelectors,
    fallbackPriceSelectors: CANDIDATE_PRICE_SELECTORS,
    pricePattern: PRICE_REGEX.source,
    priceFlags: PRICE_REGEX.flags,
    frequencyHints,
    operationHints,
  };
}

async function extractRawOffers(page, source, config) {
  const settings = buildEvaluationSettings(source, config);
  return page.evaluate((opts) => {
    const toAbsolute = (href) => {
      try {
        return href ? new URL(href, window.location.href).href : null;
      } catch {
        return href;
      }
    };

    const priceRegex = new RegExp(opts.pricePattern, opts.priceFlags);
    const frequencyHints = opts.frequencyHints.map((hint) => ({
      regexp: new RegExp(hint.pattern, hint.flags),
      label: hint.label,
    }));

    const operationHints = Object.fromEntries(
      Object.entries(opts.operationHints).map(([operation, patterns]) => [
        operation,
        patterns.map((token) => new RegExp(token.pattern, token.flags)),
      ]),
    );

    const seenLinks = new Set();
    const candidates = [];

    for (const selector of opts.cardSelectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      for (const node of nodes) {
        if (!candidates.includes(node)) {
          candidates.push(node);
        }
      }
    }

    if (!candidates.length) {
      const priceNodes = [];
      for (const selector of opts.fallbackPriceSelectors) {
        priceNodes.push(...document.querySelectorAll(selector));
      }
      const fallbackNodes = priceNodes.length
        ? priceNodes
        : Array.from(document.querySelectorAll('body *')).filter((node) => {
            const text = (node.textContent ?? '').trim();
            if (!text || text.length > 80) {
              return false;
            }
            priceRegex.lastIndex = 0;
            return priceRegex.test(text);
          });

      for (const node of fallbackNodes) {
        let current = node;
        while (current && current !== document.body) {
          if (candidates.includes(current)) {
            break;
          }
          if (current.querySelector('a[href]')) {
            candidates.push(current);
            break;
          }
          current = current.parentElement;
        }
      }
    }

    const uniqueCandidates = candidates.filter((node, index) => {
      const parent = node.parentElement;
      if (!parent) {
        return true;
      }
      return !candidates.includes(parent) || candidates.indexOf(parent) > index;
    });

    const offers = [];

    const resolveText = (element) => (element ? element.textContent.trim() : '');

    for (const card of uniqueCandidates) {
      if (offers.length >= opts.maxOffers) {
        break;
      }

      const link = Array.from(card.querySelectorAll('a[href]')).find((anchor) => {
        const href = anchor.getAttribute('href') ?? '';
        return href && !href.startsWith('#') && !href.toLowerCase().startsWith('javascript:');
      });

      if (!link) {
        continue;
      }

      const href = toAbsolute(link.getAttribute('href'));
      if (!href || seenLinks.has(href)) {
        continue;
      }

      let title = '';
      for (const selector of opts.titleSelectors) {
        const element = card.querySelector(selector);
        if (element) {
          title = resolveText(element);
          if (title) {
            break;
          }
        }
      }

      if (!title) {
        title = resolveText(link);
      }

      if (!title) {
        continue;
      }

      let priceText = '';
      for (const selector of opts.priceSelectors) {
        const node = card.querySelector(selector);
        if (node) {
          priceText = resolveText(node);
          if (priceText) {
            break;
          }
        }
      }

      priceRegex.lastIndex = 0;
      if (!priceText) {
        const matches = (card.textContent ?? '').match(priceRegex);
        if (matches) {
          priceText = matches[0];
        }
      } else {
        const matches = priceText.match(priceRegex);
        if (matches) {
          priceText = matches[0];
        }
      }

      let locationText = '';
      for (const selector of opts.locationSelectors) {
        const node = card.querySelector(selector);
        if (node) {
          locationText = resolveText(node);
          if (locationText) {
            break;
          }
        }
      }

      const imageNode = card.querySelector('img[data-src], img[src], source[srcset]');
      let image = null;
      const gallery = [];
      if (imageNode) {
        const dataSrc = imageNode.getAttribute('data-src');
        const src = imageNode.getAttribute('src');
        const srcset = imageNode.getAttribute('srcset');
        if (src && !src.startsWith('data:')) {
          image = toAbsolute(src);
        } else if (dataSrc) {
          image = toAbsolute(dataSrc);
        }
        if (srcset) {
          const entries = srcset.split(',').map((item) => item.trim().split(' ')[0]).filter(Boolean);
          for (const entry of entries) {
            gallery.push(toAbsolute(entry));
          }
        }
      }

      if (!image) {
        const bgNode = card.querySelector('[style*="background"]');
        if (bgNode) {
          const style = bgNode.getAttribute('style') ?? '';
          const match = style.match(/url\(([^)]+)\)/i);
          if (match) {
            image = toAbsolute(match[1].replace(/['"]/g, ''));
          }
        }
      }

      const detailCandidates = new Set();
      card.querySelectorAll('li, p, span, div').forEach((node) => {
        if (!node) {
          return;
        }
        const text = (node.textContent ?? '').replace(/\s+/g, ' ').trim();
        if (!text || text.length > 160) {
          return;
        }
        if (text === title || text === priceText || text === locationText) {
          return;
        }
        if (detailCandidates.size >= 10) {
          return;
        }
        detailCandidates.add(text);
      });

      const snippet = (card.innerText ?? card.textContent ?? '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(0, 6);

      const yearMatch = (card.innerText ?? card.textContent ?? '').match(/\b(19|20)\d{2}\b/);
      const year = yearMatch ? Number.parseInt(yearMatch[0], 10) : null;

      let operationHint = null;
      const textForOps = [title, priceText, ...detailCandidates, locationText, snippet.join(' ')].join(' ');
      for (const [operation, patterns] of Object.entries(operationHints)) {
        if (patterns.some((pattern) => pattern.test(textForOps))) {
          operationHint = operation;
          break;
        }
      }

      let frequencyHint = null;
      for (const hint of frequencyHints) {
        if (hint.regexp.test(priceText) || Array.from(detailCandidates).some((item) => hint.regexp.test(item))) {
          frequencyHint = hint.label;
          break;
        }
      }

      offers.push({
        title,
        link: href,
        priceText,
        locationText,
        detailTexts: Array.from(detailCandidates),
        snippet,
        image,
        gallery,
        year,
        operationHint,
        frequencyHint,
      });

      seenLinks.add(href);
    }

    return offers;
  }, settings);
}

async function scrapeSource(browser, source, config) {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    userAgent: config.userAgent,
  });

  page.setDefaultTimeout(config.navigationTimeout);

  const result = {
    source,
    offers: [],
    error: null,
  };

  try {
    await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: config.navigationTimeout });
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await dismissCookieBanners(page);
    await page.waitForTimeout(config.waitAfterLoadMs);

    const rawOffers = await extractRawOffers(page, source, config);
    const normalizedOffers = rawOffers.map((offer) => convertRawOffer(offer, source));
    result.offers = uniqueByUrl(normalizedOffers);
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    await page.close();
  }

  return result;
}

function buildScraperOptions(options = {}) {
  const config = { ...DEFAULT_SCRAPER_OPTIONS };

  if (options.maxOffersPerSource != null) {
    config.maxOffersPerSource = Number(options.maxOffersPerSource);
  }
  if (options.navigationTimeout != null) {
    config.navigationTimeout = Number(options.navigationTimeout);
  }
  if (options.waitAfterLoadMs != null) {
    config.waitAfterLoadMs = Number(options.waitAfterLoadMs);
  }
  if (options.userAgent) {
    config.userAgent = options.userAgent;
  }

  return config;
}

function filterSourcesList(sources, options = {}) {
  let filtered = [...sources];

  if (typeof options.filterSources === 'function') {
    filtered = filtered.filter(options.filterSources);
  }

  if (options.allowedDomains?.length) {
    const allowed = new Set(options.allowedDomains.map((item) => item.toLowerCase()));
    filtered = filtered.filter((source) => allowed.has(source.domain.toLowerCase()));
  }

  if (options.excludeDomains?.length) {
    const excluded = new Set(options.excludeDomains.map((item) => item.toLowerCase()));
    filtered = filtered.filter((source) => !excluded.has(source.domain.toLowerCase()));
  }

  if (options.allowedOperations?.length) {
    const allowedOps = new Set(options.allowedOperations.map((op) => op.toLowerCase()));
    filtered = filtered.filter((source) => !source.operation || allowedOps.has(source.operation.toLowerCase()));
  }

  if (options.limitSources && Number.isInteger(options.limitSources)) {
    filtered = filtered.slice(0, Number(options.limitSources));
  }

  return filtered;
}

export async function scrapeRealEstateSources(options = {}) {
  const config = buildScraperOptions(options);
  const onSourceStart = typeof options.onSourceStart === 'function' ? options.onSourceStart : () => {};
  const onSourceComplete = typeof options.onSourceComplete === 'function' ? options.onSourceComplete : () => {};

  const sources = options.sources ?? (await loadScrapingSources());
  const filteredSources = filterSourcesList(sources, options);

  if (!filteredSources.length) {
    return {
      generatedAt: new Date().toISOString(),
      totalOffers: 0,
      sourcesProcessed: 0,
      sources: [],
      offers: [],
      durationMs: 0,
      config,
    };
  }

  const browser = await chromium.launch({ headless: true });
  const aggregated = [];
  const metadata = [];
  const startedAt = Date.now();

  try {
    for (const source of filteredSources) {
      onSourceStart(source);
      const sourceStartedAt = Date.now();
      const { offers, error } = await scrapeSource(browser, source, config);
      const durationMs = Date.now() - sourceStartedAt;
      onSourceComplete({ source, offers, error, durationMs });

      aggregated.push(...offers);
      metadata.push({
        url: source.url,
        domain: source.domain,
        operation: source.operation,
        offers: offers.length,
        error,
        durationMs,
      });
    }
  } finally {
    await browser.close();
  }

  const durationMs = Date.now() - startedAt;

  return {
    generatedAt: new Date().toISOString(),
    totalOffers: aggregated.length,
    sourcesProcessed: metadata.length,
    sources: metadata,
    offers: aggregated,
    durationMs,
    config,
  };
}

async function ensureOutputDir() {
  await mkdir(OUTPUT_DIR, { recursive: true });
}

async function main() {
  await ensureOutputDir();

  const result = await scrapeRealEstateSources({
    onSourceStart: (source) => {
      console.log(`\n[SCRAPER] Procesando: ${source.url}`);
    },
    onSourceComplete: ({ source, offers, error, durationMs }) => {
      if (error) {
        console.warn(`  - Error al procesar ${source.url}: ${error}`);
      } else {
        console.log(`  - Ofertas normalizadas: ${offers.length} (${durationMs} ms)`);
      }
    },
  });

  if (!result.sourcesProcessed) {
    console.error('No se encontraron fuentes válidas para procesar.');
    process.exitCode = 1;
    return;
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`\n[SCRAPER] Resultado escrito en ${OUTPUT_FILE}`);
  console.log(`[SCRAPER] Fuentes procesadas: ${result.sourcesProcessed}`);
  console.log(`[SCRAPER] Total de ofertas: ${result.totalOffers}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error('[SCRAPER] Error fatal:', error);
    process.exitCode = 1;
  });
}
