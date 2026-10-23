import crypto from 'node:crypto';

const AGENT = 'NoogleBot/1.1 (+https://shemsizedek.github.io/neo-system/noogle/)';
const privateHost = host => /^(localhost|.*\.localhost|.*\.local|.*\.internal)$/i.test(host) || /^(127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|fc|fd|fe80)/i.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host);

export function permittedUrl(value, root) {
  const u = new URL(value), r = new URL(root);
  if (u.protocol !== 'https:' || u.username || u.password || u.port || privateHost(u.hostname)) return false;
  if (u.origin !== r.origin) return false;
  const base = r.pathname.endsWith('/') ? r.pathname : r.pathname + '/';
  return u.pathname === r.pathname || u.pathname.startsWith(base);
}

function disallowed(path, robots) {
  let agent = '', blocked = [];
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.split('#')[0].trim(), colon = line.indexOf(':');
    if (colon < 0) continue;
    const key = line.slice(0, colon).trim().toLowerCase(), value = line.slice(colon + 1).trim();
    if (key === 'user-agent') agent = value.toLowerCase();
    if (key === 'disallow' && (agent === '*' || agent.includes('nooglebot')) && value) blocked.push(value);
  }
  return blocked.some(rule => path.startsWith(rule));
}

async function request(url, fetcher) {
  const response = await fetcher(url, { redirect: 'manual', headers: { 'user-agent': AGENT, accept: 'text/html,text/plain;q=0.8' }, signal: AbortSignal.timeout(12000) });
  if (response.status >= 300 && response.status < 400) throw new Error('redirect_not_allowed');
  return response;
}

export async function crawlKnowindex(source, { fetcher = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  if (source.id !== 'world-library-knowindex') throw new Error('unexpected_source');
  const root = new URL(source.url);
  if (!permittedUrl(root.href, root.href)) throw new Error('invalid_root');
  const robotsUrl = root.origin + '/robots.txt';
  let robots;
  try {
    const response = await request(robotsUrl, fetcher);
    if (response.status === 404 || response.status === 410) robots = '';
    else if (!response.ok) throw new Error('robots_http_' + response.status);
    else robots = await response.text();
  } catch (error) { throw new Error('robots_unavailable:' + String(error.message || error)); }
  const maxPages = Math.min(10, Math.max(1, Number(source.crawl?.maxPages) || 10));
  const delayMs = Math.max(1500, Number(source.crawl?.delayMs) || 1500);
  const queue = [root.href], seen = new Set(), records = [], errors = [];
  while (queue.length && records.length < maxPages) {
    const url = queue.shift();
    if (seen.has(url) || !permittedUrl(url, root.href)) continue;
    seen.add(url);
    if (disallowed(new URL(url).pathname, robots)) continue;
    try {
      const response = await request(url, fetcher);
      if (!response.ok) throw new Error('http_' + response.status);
      if (!/^(text\/html|text\/plain|application\/xhtml\+xml)/i.test(response.headers.get('content-type') || '')) throw new Error('unsupported_type');
      const html = await response.text();
      const hash = crypto.createHash('sha256').update(html).digest('hex');
      const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || url).replace(/<[^>]*>/g, '').trim().slice(0, 240);
      const summary = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);
      records.push({ summary, id: crypto.createHash('sha256').update(url).digest('hex').slice(0, 24), url, canonicalUrl: url, title, contentHash: hash, publisher: source.name, communities: [source.community], evidenceState: 'reference', retrievedAt: new Date().toISOString() });
      if (url === root.href && Number(source.crawl?.maxDepth) > 0) {
        for (const match of html.matchAll(/<a\b[^>]*href=["']([^"'#]+)["']/gi)) {
          try { const next = new URL(match[1], url); next.hash = ''; if (permittedUrl(next.href, root.href) && !seen.has(next.href) && !queue.includes(next.href)) queue.push(next.href); } catch {}
        }
      }
    } catch (error) { errors.push({ url, error: String(error.message || error) }); }
    if (queue.length && records.length < maxPages) await sleep(delayMs);
  }
  return { sourceId: source.id, rootUrl: root.href, records, crawled: records.length, errors, robotsUrl };
}
