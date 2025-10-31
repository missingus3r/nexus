import { SurlinkListing } from '../models/index.js';

const FREQUENCY_MAP = {
  monthly: 'monthly',
  weekly: 'weekly',
  yearly: 'annual',
  annual: 'annual',
  yearlyRental: 'annual',
  daily: 'seasonal',
};

function sanitizeText(value) {
  if (typeof value !== 'string') {
    return null;
  }
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : null;
}

function pruneEmpty(obj) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  const entries = Object.entries(obj)
    .filter(([, value]) => value !== undefined && value !== null && value !== '');

  if (!entries.length) {
    return undefined;
  }

  return Object.fromEntries(entries);
}

function buildLocation(rawLocation) {
  const locationText = sanitizeText(rawLocation);
  const base = {
    country: 'Uruguay',
  };

  if (!locationText) {
    return base;
  }

  const parts = locationText.split(',').map((part) => sanitizeText(part)).filter(Boolean);
  if (parts[0]) {
    base.city = parts[0];
  }
  if (parts[1]) {
    base.state = parts.slice(1).join(', ');
  }

  base.address = locationText;
  return base;
}

function collectMedia(offer) {
  const candidates = [
    sanitizeText(offer.image),
    ...(Array.isArray(offer.gallery) ? offer.gallery : []),
  ];

  const media = [];
  const seen = new Set();

  for (const item of candidates) {
    if (!item || typeof item !== 'string') {
      continue;
    }
    if (!seen.has(item)) {
      media.push(item);
      seen.add(item);
    }
  }

  return media;
}

function slugify(value) {
  if (!value) {
    return null;
  }
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function buildTags(offer) {
  const tags = new Set(['scraper', 'real-estate']);

  if (offer.operation) {
    tags.add(slugify(offer.operation) ?? offer.operation);
  }

  if (offer.sourceDomain) {
    tags.add(slugify(offer.sourceDomain) ?? offer.sourceDomain);
  }

  if (offer.location) {
    offer.location
      .split(',')
      .map((part) => slugify(part))
      .filter(Boolean)
      .slice(0, 3)
      .forEach((part) => tags.add(part));
  }

  return Array.from(tags).filter(Boolean);
}

function mapFrequency(offer) {
  const freq = offer?.price?.frequency;
  if (freq && FREQUENCY_MAP[freq]) {
    return FREQUENCY_MAP[freq];
  }

  if (offer?.operation === 'sale') {
    return 'one-time';
  }

  if (offer?.operation === 'rent' && !freq) {
    return 'monthly';
  }

  return freq ? 'one-time' : 'negotiable';
}

function buildAttributes(offer) {
  const attributes = {
    sourceUrl: offer.url,
    sourceDomain: offer.sourceDomain,
    rawPrice: offer.price?.raw,
    operation: offer.operation,
    details: Array.isArray(offer.details) ? offer.details : undefined,
    locationText: offer.location,
    year: offer.year ?? undefined,
    gallery: Array.isArray(offer.gallery) && offer.gallery.length ? offer.gallery : undefined,
    scrapedAt: new Date().toISOString(),
  };

  return pruneEmpty(attributes);
}

function buildDescription(offer) {
  const explicit = sanitizeText(offer.description);
  if (explicit) {
    return explicit;
  }

  const details = Array.isArray(offer.details)
    ? offer.details.map((item) => sanitizeText(item)).filter(Boolean)
    : [];

  if (details.length) {
    return details.join(' • ');
  }

  return sanitizeText(offer.location);
}

function buildSummary(offer) {
  const details = Array.isArray(offer.details) ? offer.details : [];
  return (
    sanitizeText(details[0]) ||
    sanitizeText(offer.location) ||
    sanitizeText(offer.price?.raw) ||
    sanitizeText(offer.operation)
  );
}

function buildUpdatePayload(offer, category, requestedBy) {
  const price = pruneEmpty({
    amount: offer.price?.amount ?? null,
    currency: offer.price?.currency ?? 'USD',
    frequency: mapFrequency(offer),
  });

  const location = pruneEmpty(buildLocation(offer.location));
  const attributes = buildAttributes(offer);
  const media = collectMedia(offer);

  const setDoc = pruneEmpty({
    category,
    title: sanitizeText(offer.title) ?? offer.title,
    subtitle: sanitizeText(offer.price?.raw),
    summary: buildSummary(offer),
    description: buildDescription(offer),
    price,
    location,
    tags: buildTags(offer),
    attributes,
    media,
    status: 'active',
    source: offer.sourceDomain ?? 'scraper',
  });

  if (!setDoc.title) {
    setDoc.title = offer.title;
  }

  return {
    $set: setDoc,
    $setOnInsert: {
      createdBy: requestedBy ?? 'scraper',
      category,
    },
  };
}

export async function ingestRealEstateOffers({
  offers,
  category = 'casas',
  requestedBy = 'scraper',
  logger,
} = {}) {
  if (!Array.isArray(offers) || offers.length === 0) {
    return {
      inserted: 0,
      updated: 0,
      skipped: 0,
      processedIds: [],
    };
  }

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const processedIds = [];

  for (const offer of offers) {
    if (!offer?.url || !offer?.title) {
      skipped += 1;
      continue;
    }

    const payload = buildUpdatePayload(offer, category, requestedBy);

    try {
      const rawResult = await SurlinkListing.findOneAndUpdate(
        { category, 'attributes.sourceUrl': offer.url },
        payload,
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
          rawResult: true,
        },
      );

      const updatedExisting = rawResult?.lastErrorObject?.updatedExisting;
      const doc = rawResult?.value;

      if (!doc) {
        skipped += 1;
        continue;
      }

      if (updatedExisting) {
        updated += 1;
      } else {
        inserted += 1;
      }

      if (doc._id) {
        processedIds.push(doc._id);
      }
    } catch (error) {
      skipped += 1;
      if (logger?.error) {
        logger.error('Error ingestando oferta de Surlink', {
          url: offer.url,
          error: error.message,
        });
      }
    }
  }

  return {
    inserted,
    updated,
    skipped,
    processedIds,
  };
}

