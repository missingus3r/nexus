export const OUTPUT_SCHEMA = {
  title: null,
  url: null,
  image: null,
  gallery: [],
  price: {
    amount: null,
    currency: null,
    frequency: null,
    raw: null,
  },
  operation: null,
  location: null,
  year: null,
  details: [],
  description: null,
  sourceUrl: null,
  sourceDomain: null,
};

export const PRICE_REGEX = /(?:u?\$s|usd|u\$|\$u|uyu|us\$|us\$s|\$)\s?[0-9]{1,3}(?:[.,][0-9]{3})*(?:[.,][0-9]{1,2})?(?:\s?(?:mil|millones))?/gi;

export const OPERATION_HINTS = {
  rent: [/alquiler/i, /rent/i, /lease/i, /arrenda/i],
  sale: [/venta/i, /sale/i, /(?:compra|compre)/i, /sell/i],
};

export const FREQUENCY_HINTS = [
  { match: /mes/i, label: 'monthly' },
  { match: /semana/i, label: 'weekly' },
  { match: /dia/i, label: 'daily' },
  { match: /(?:a\u00f1o|ano)/i, label: 'yearly' },
];

export const LOCATION_HINT_CLASSES = [
  '[class*="ubic"]',
  '[class*="location"]',
  '[class*="localidad"]',
  '[class*="barrio"]',
  '[class*="zona"]',
  '[class*="ciudad"]',
  '[class*="depart"]',
];

export const CANDIDATE_CARD_SELECTORS = [
  '[class*="listing-card"]',
  '[class*="listingCard"]',
  '[class*="property-card"]',
  '[class*="property_item"]',
  '[class*="property-item"]',
  '[class*="property__item"]',
  '[class*="property-listing"]',
  '[class*="inmueble"]',
  '[class*="resultado"]',
  '[class*="propiedad"]',
  '[class*="listingBox"]',
  'article[class*="listing"]',
  'article[class*="property"]',
  'li[class*="listing"]',
  'li[class*="propiedad"]',
];

export const CANDIDATE_PRICE_SELECTORS = [
  '[class*="price"]',
  '[class*="precio"]',
  '[class*="valor"]',
  '[class*="amount"]',
  '[class*="cost"]',
  'span[aria-label*="precio"]',
  'strong[aria-label*="precio"]',
];

export const CANDIDATE_TITLE_SELECTORS = [
  'a[title]',
  'h1 a',
  'h2 a',
  'h3 a',
  'h1',
  'h2',
  'h3',
  '[class*="titulo"]',
  '[class*="title"]',
];

export const DOMAIN_OVERRIDES = {
  'www.infocasas.com.uy': {
    cardSelectors: ['.listingCard'],
    titleSelectors: ['.listingCard h2 a', '.listingCard .cardTitleLink'],
    priceSelectors: ['.listingCard [class*="Price"]', '.listingCard [class*="price"]'],
    locationSelectors: ['.listingCard [class*="location"]'],
  },
  'infocasas.com.uy': {
    cardSelectors: ['.listingCard'],
  },
  'www.gallito.com.uy': {
    cardSelectors: [
      '.avisoRow',
      '.aviso-row',
      '.result-zone .row',
    ],
    priceSelectors: ['.precio', '.price'],
    titleSelectors: ['h4 a', '.titulo a'],
    locationSelectors: ['.lugar', '.ubicacion'],
  },
  'gallito.com.uy': {
    cardSelectors: ['.avisoRow', '.aviso-row'],
  },
  'prop.com.uy': {
    cardSelectors: ['.listing-card', '.css-1k8w84k'],
    priceSelectors: ['[class*="price"]'],
    titleSelectors: ['[class*="title"] a'],
    locationSelectors: ['[class*="location"]'],
  },
  'braglia.com.uy': {
    cardSelectors: ['.property-card', '.inmueble'],
    priceSelectors: ['.property-card__price', '.precio'],
  },
  'www.campiglia.com.uy': {
    cardSelectors: ['.unit-card', '.property-card'],
  },
  'inmobiliariabelvedere.com.uy': {
    cardSelectors: ['.property-item', '.card'],
  },
  'inmobiliariaimperial.com': {
    cardSelectors: ['.propiedad', '.property'],
  },
  'sigaloavarela.com': {
    cardSelectors: ['.listing-card', '.property-card'],
  },
  'www.sigaloavarela.com': {
    cardSelectors: ['.listing-card', '.property-card'],
  },
  'www.inmobiliariaimperial.com': {
    cardSelectors: ['.propiedad', '.property'],
  },
};
