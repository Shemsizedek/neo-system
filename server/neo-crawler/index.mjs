import { crawlPublicSource } from '../../apps/noogle/index/crawler.mjs';
import { crawlDomain } from '../../apps/noogle/index/domain-crawler.mjs';

export const NEO_CRAWLER_VERSION = '1.0.0';

export function createNeoCrawler({ adapters = {} } = {}) {
  const registry = new Map();

  function register(name, handler) {
    if (!name || typeof handler !== 'function') throw new TypeError('adapter name and handler are required');
    registry.set(name, handler);
    return api;
  }

  async function crawl(input, options = {}) {
    if (typeof input === 'string') {
      return envelope('public-source', await crawlPublicSource(input, options));
    }

    if (!input || typeof input !== 'object') throw new TypeError('crawl input must be a URL string or source descriptor');

    if (input.adapter) {
      const handler = registry.get(input.adapter);
      if (!handler) throw new Error(`Unknown NEO Crawler adapter: ${input.adapter}`);
      return envelope(input.adapter, await handler(input, options));
    }

    if (input.url && (input.mode === 'domain' || input.crawl)) {
      return envelope('domain', await crawlDomain(input, options));
    }

    if (input.url) {
      return envelope('public-source', await crawlPublicSource(input.url, { ...options, ...input.options }));
    }

    throw new Error('source descriptor must include url or adapter');
  }

  function capabilities() {
    return {
      service: 'NEO Crawler',
      version: NEO_CRAWLER_VERSION,
      builtIns: ['public-source', 'domain'],
      adapters: [...registry.keys()].sort(),
      boundaries: {
        publicHttpOnly: true,
        bypassAuthentication: false,
        bypassRobotsOrAccessControls: false,
        bypassCaptcha: false,
        bypassPaywalls: false
      },
      downstream: ['NEO Router', 'NEO Algo', 'NEO Oracle', 'NEOsync', 'Noogle/Neopedia', 'GISS NEO LMS', 'NEO Law']
    };
  }

  const api = { crawl, register, capabilities };
  for (const [name, handler] of Object.entries(adapters)) register(name, handler);
  return api;
}

function envelope(adapter, result) {
  return {
    service: 'NEO Crawler',
    version: NEO_CRAWLER_VERSION,
    adapter,
    generatedAt: new Date().toISOString(),
    provenanceRequired: true,
    classification: {
      factInferenceSeparation: true,
      sourceIdentityRequired: true,
      legalAuthorityAutomatic: false,
      doctrineAutomatic: false,
      lmsPublicationAutomatic: false
    },
    result
  };
}

export const neoCrawler = createNeoCrawler();
