import { crawlPublicSource, normalizeUrl } from './crawler.mjs';

const USER_AGENT = 'NoogleBot/1.1 (+https://shemsizedek.github.io/neo-system/noogle/)';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function hostAllowed(candidate, root) {
  const c = new URL(candidate);
  const r = new URL(root);
  return c.hostname === r.hostname;
}

async function fetchRobots(rootUrl, timeoutMs = 8000) {
  const root = new URL(rootUrl);
  const robotsUrl = `${root.protocol}//${root.host}/robots.txt`;
  try {
    const response = await fetch(robotsUrl, { headers: { 'user-agent': USER_AGENT }, signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return { url: robotsUrl, disallow: [] };
    const text = await response.text();
    const lines = text.split(/\r?\n/);
    let applies = false;
    const disallow = [];
    for (const raw of lines) {
      const line = raw.replace(/#.*$/, '').trim();
      if (!line) continue;
      const [keyRaw, ...rest] = line.split(':');
      const key = keyRaw.trim().toLowerCase();
      const value = rest.join(':').trim();
      if (key === 'user-agent') applies = value === '*' || value.toLowerCase().includes('nooglebot');
      else if (applies && key === 'disallow' && value) disallow.push(value);
    }
    return { url: robotsUrl, disallow };
  } catch {
    return { url: robotsUrl, disallow: [] };
  }
}

function allowedByRobots(url, rules) {
  const path = new URL(url).pathname || '/';
  return !rules.disallow.some(rule => rule !== '/' && path.startsWith(rule)) && !rules.disallow.includes('/');
}

function extractLinks(html, baseUrl) {
  const links = [];
  const regex = /<a\b[^>]*href=["']([^"'#]+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html))) {
    try {
      const url = normalizeUrl(new URL(match[1], baseUrl).toString());
      links.push(url);
    } catch {}
  }
  return links;
}

async function fetchHtml(url, timeoutMs = 12000) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.7' },
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const type = response.headers.get('content-type') || '';
  if (!/text\/(html|plain)|application\/xhtml\+xml/i.test(type)) throw new Error(`Unsupported content type: ${type}`);
  return response.text();
}

export async function crawlDomain(source, options = {}) {
  const rootUrl = normalizeUrl(source.url);
  const maxDepth = Math.max(0, Math.min(3, Number(source.crawl?.maxDepth ?? options.maxDepth ?? 1)));
  const maxPages = Math.max(1, Math.min(50, Number(source.crawl?.maxPages ?? options.maxPages ?? 12)));
  const delayMs = Math.max(250, Number(source.crawl?.delayMs ?? options.delayMs ?? 900));
  const robots = await fetchRobots(rootUrl);
  const queue = [{ url: rootUrl, depth: 0 }];
  const seen = new Set();
  const docs = [];
  const errors = [];

  while (queue.length && docs.length < maxPages) {
    const current = queue.shift();
    if (seen.has(current.url)) continue;
    seen.add(current.url);
    if (!hostAllowed(current.url, rootUrl) || !allowedByRobots(current.url, robots)) continue;

    try {
      const html = await fetchHtml(current.url);
      const doc = await crawlPublicSource(current.url, {
        sourceClass: source.sourceClass || source.type || 'other',
        evidenceState: source.evidenceState || 'unverified',
        publisher: source.name,
        communities: source.community ? [source.community] : [],
        communitySpecific: Boolean(source.community),
        communityAuthority: source.community ? 0.8 : 0
      });
      docs.push(doc);

      if (current.depth < maxDepth) {
        for (const link of extractLinks(html, current.url)) {
          if (hostAllowed(link, rootUrl) && allowedByRobots(link, robots) && !seen.has(link)) {
            queue.push({ url: link, depth: current.depth + 1 });
          }
        }
      }
    } catch (error) {
      errors.push({ url: current.url, error: String(error?.message || error) });
    }

    if (queue.length && docs.length < maxPages) await sleep(delayMs);
  }

  return { sourceId: source.id, rootUrl, robots, maxDepth, maxPages, crawled: docs.length, docs, errors };
}
