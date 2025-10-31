import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { OPERATION_HINTS } from '../config/realEstateScraperConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');

const SCRAPING_SITES_FILE = path.join(ROOT_DIR, 'scrapping_sites.md');

const HTTP_URL_REGEX = /^https?:\/\//i;

function inferOperation(url, fallbackText = '') {
  const haystack = `${url} ${fallbackText}`.toLowerCase();
  for (const [operation, patterns] of Object.entries(OPERATION_HINTS)) {
    if (patterns.some((pattern) => pattern.test(haystack))) {
      return operation;
    }
  }
  return null;
}

function cleanUrl(raw) {
  let candidate = raw.trim();

  const commentMarker = candidate.indexOf(' //');
  if (commentMarker !== -1) {
    candidate = candidate.slice(0, commentMarker);
  }

  const hashMarker = candidate.indexOf('#');
  if (hashMarker !== -1) {
    candidate = candidate.slice(0, hashMarker);
  }

  candidate = candidate.replace(/\s+/g, '');
  candidate = candidate.replace(/\/+$/, '');

  return candidate;
}

export async function loadScrapingSources() {
  const fileContent = await readFile(SCRAPING_SITES_FILE, 'utf-8');
  const lines = fileContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const urls = [];

  for (const line of lines) {
    if (!HTTP_URL_REGEX.test(line)) {
      continue;
    }

    const cleaned = cleanUrl(line);
    try {
      const url = new URL(cleaned);
      const domain = url.hostname;
      const operation = inferOperation(cleaned);

      urls.push({
        url: url.toString(),
        domain,
        operation,
      });
    } catch {
      // Ignore malformed URLs but keep going.
    }
  }

  return urls;
}
