import { createHash } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { rankDocument } from '../../apps/noogle/index/ranker.mjs';
import { createNeoCrawler } from './index.mjs';

// Contract inspected at this upstream revision; no runtime install is performed.
export const CRAWL4AI_CONTRACT_REVISION = '888299fb5f0b82181897dc0e61bfb4b036f0aea5';

function sourceUrl(value) {
  const url = new URL(value);
  const host = url.hostname;
  if (url.protocol !== 'https:' || url.username || url.password || url.port ||
      isIP(host) || host.startsWith('[') || !host.includes('.') ||
      /(^|\.)(localhost|local|internal|test|invalid|example|onion)$/.test(host) ||
      host.endsWith('.')) throw new Error('crawl4ai_source_not_allowed');
  url.hash = '';
  return url;
}

function publicIPv4(address) {
  if (isIP(address) !== 4) return false; // IPv6 support needs a separate reviewed policy.
  const [a,b,c] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113));
}

async function abortable(promise, signal) {
  if (signal.aborted) throw new Error('crawl4ai_timeout');
  let listener;
  const aborted = new Promise((_, reject) => {
    listener = () => reject(new Error('crawl4ai_timeout'));
    signal.addEventListener('abort', listener, { once: true });
  });
  try { return await Promise.race([promise, aborted]); }
  finally { signal.removeEventListener('abort', listener); }
}

async function readJson(response, limit, signal) {
  if (!response.body?.getReader) throw new Error('crawl4ai_body_stream_required');
  const reader = response.body.getReader();
  let bytes = 0;
  const chunks = [];
  try {
    for (;;) {
      const { done, value } = await abortable(reader.read(), signal);
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) throw new Error('crawl4ai_response_too_large');
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}

export function createCrawl4AIAdapter({
  serviceOrigin, apiToken, allowedOrigins, fetchImpl = fetch, lookupImpl = lookup,
  timeoutMs = 20_000, maxResponseBytes = 2_000_000, maxMarkdownBytes = 500_000,
  minIntervalMs = 1000, now = () => Date.now(),
} = {}) {
  const service = new URL(serviceOrigin);
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(service.hostname);
  if (!(service.protocol === 'https:' || (service.protocol === 'http:' && loopback)) ||
      service.username || service.password || service.pathname !== '/' || service.search || service.hash) {
    throw new TypeError('crawl4ai_service_origin_invalid');
  }
  if (typeof apiToken !== 'string' || !apiToken.trim() || /[\r\n]/.test(apiToken)) throw new TypeError('crawl4ai_api_token_required');
  if (!Array.isArray(allowedOrigins) || !allowedOrigins.length || allowedOrigins.length > 64) throw new TypeError('crawl4ai_allowlist_required');
  const origins = new Set(allowedOrigins.map(value => {
    const url = sourceUrl(value);
    if (url.pathname !== '/' || url.search || new URL(value).hash) throw new TypeError('crawl4ai_allowlist_origin_required');
    return url.origin;
  }));
  for (const [name,value,max] of [
    ['timeoutMs',timeoutMs,60_000], ['maxResponseBytes',maxResponseBytes,5_000_000],
    ['maxMarkdownBytes',maxMarkdownBytes,1_000_000], ['minIntervalMs',minIntervalMs,60_000],
  ]) if (!Number.isInteger(value) || value < 1 || value > max) throw new TypeError('crawl4ai_invalid_' + name);
  let busy = false;
  let lastStarted = -Infinity;
  return async function crawl4ai(input) {
    const url = sourceUrl(input?.url);
    if (!origins.has(url.origin)) throw new Error('crawl4ai_source_not_allowed');
    if (busy || now() - lastStarted < minIntervalMs) throw new Error('crawl4ai_rate_limited');
    busy = true;
    lastStarted = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const addresses = await abortable(lookupImpl(url.hostname, { all: true }), controller.signal);
      if (!addresses.length || addresses.some(x => !publicIPv4(x.address))) throw new Error('crawl4ai_source_not_allowed');
      // Preflight is not DNS pinning. The isolated Crawl4AI service must enforce
      // pinned public-only egress for seeds, redirects, robots and subresources.
      const response = await abortable(fetchImpl(new URL('/crawl', service), {
        method: 'POST', redirect: 'error', signal: controller.signal,
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + apiToken },
        body: JSON.stringify({
          urls: [url.href],
          browser_config: { type: 'BrowserConfig', params: {
            java_script_enabled: false, accept_downloads: false, text_mode: true,
          } },
          crawler_config: { type: 'CrawlerRunConfig', params: {
            check_robots_txt: true, stream: false, page_timeout: Math.min(timeoutMs, 15_000),
            screenshot: false, pdf: false, process_iframes: false,
            remove_forms: true, word_count_threshold: 1,
            cache_mode: { type: 'CacheMode', params: 'bypass' },
          } },
        }),
      }), controller.signal);
      if (!response.ok) throw new Error('crawl4ai_http_' + response.status);
      if (!/application\/json/i.test(response.headers.get('content-type') || '')) throw new Error('crawl4ai_content_type_invalid');
      const body = await readJson(response, maxResponseBytes, controller.signal);
      if (body.success !== true || !Array.isArray(body.results) || body.results.length !== 1) throw new Error('crawl4ai_result_invalid');
      const result = body.results[0];
      if (result.success !== true || !Number.isInteger(result.status_code) ||
          result.status_code < 200 || result.status_code >= 300) throw new Error('crawl4ai_result_failed');
      if (sourceUrl(result.url).href !== url.href ||
          (result.redirected_url && sourceUrl(result.redirected_url).href !== url.href)) throw new Error('crawl4ai_redirect_rejected');
      const markdown = typeof result.markdown === 'string' ? result.markdown : result.markdown?.raw_markdown;
      if (typeof markdown !== 'string' || !markdown.trim()) throw new Error('crawl4ai_markdown_required');
      if (Buffer.byteLength(markdown) > maxMarkdownBytes) throw new Error('crawl4ai_markdown_too_large');
      const retrievedAt = new Date(now()).toISOString();
      return {
        id: createHash('sha256').update(url.href).digest('hex').slice(0,24),
        url: url.href, canonicalUrl: url.href,
        title: typeof result.metadata?.title === 'string' ? result.metadata.title.slice(0,240) : url.hostname,
        summary: markdown.slice(0,800), markdown, retrievedAt,
        language: 'und', sourceClass: 'other', evidenceState: 'unverified',
        publisher: url.hostname, authors: [], publishedAt: null,
        communities: [], communityTerms: [],
        contentHash: createHash('sha256').update(markdown).digest('hex'),
        contentHashScope: 'extracted-markdown-utf8',
        extraction: { tool: 'crawl4ai', contractRevision: CRAWL4AI_CONTRACT_REVISION, javascript: false },
        rank: rankDocument({ relevance: 0.5, provenance: 1, recency: 0.5, diversity: 0.5 }),
      };
    } catch (error) {
      if (controller.signal.aborted) throw new Error('crawl4ai_timeout');
      if (typeof error?.message === 'string' && /^crawl4ai_[a-z_0-9]+$/.test(error.message)) throw error;
      throw new Error('crawl4ai_request_failed'); // Never surface token/body/transport details to queue logs.
    } finally { clearTimeout(timer); busy = false; }
  };
}

export function createCrawl4AICrawler(config) {
  return createNeoCrawler({ adapters: { crawl4ai: createCrawl4AIAdapter(config) } });
}
