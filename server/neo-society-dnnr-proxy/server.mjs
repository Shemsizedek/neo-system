import http from 'node:http';

const PORT = Number(process.env.PORT || 8080);
const UPSTREAM_ORIGIN = process.env.DNNR_UPSTREAM_ORIGIN || 'https://neo.dnnr.io';
const SOCIETY_HOST = process.env.SOCIETY_HOST || 'society.holytemples.org';
const LIFESTYLE_HOST = process.env.LIFESTYLE_HOST || 'lifestyle.holytemples.org';
const LIFESTYLE_ENTRY_PATH = process.env.LIFESTYLE_ENTRY_PATH || '/neo/ambassador-application';
const MAX_REDIRECTS = 6;

const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
]);

function publicHost(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function publicProto(req) {
  return String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
}

function publicOrigin(req) {
  return `${publicProto(req)}://${publicHost(req)}`;
}

function upstreamPath(req) {
  const host = publicHost(req);
  const original = req.url || '/';
  if (host === LIFESTYLE_HOST && (original === '/' || original === '')) {
    return LIFESTYLE_ENTRY_PATH;
  }
  return original;
}

function rewriteLocation(value, req) {
  if (!value) return value;
  try {
    const upstream = new URL(value, UPSTREAM_ORIGIN);
    const base = new URL(UPSTREAM_ORIGIN);
    if (upstream.host === base.host) {
      return `${publicOrigin(req)}${upstream.pathname}${upstream.search}${upstream.hash}`;
    }
  } catch {
    // Preserve unparseable locations untouched.
  }
  return value;
}

function rewriteCookie(value, req) {
  if (!value) return value;
  return value
    .replace(/;\s*Domain=[^;]+/gi, '')
    .replace(/;\s*Secure/gi, '; Secure')
    .replace(/;\s*SameSite=None/gi, '; SameSite=None');
}

function rewriteText(body, contentType, req) {
  if (!body) return body;
  const origin = publicOrigin(req);
  let rewritten = body.split(UPSTREAM_ORIGIN).join(origin);
  rewritten = rewritten.split('//neo.dnnr.io').join(`//${publicHost(req)}`);

  if (contentType.includes('text/html')) {
    const canonical = `<link rel="canonical" href="${origin}${req.url || '/'}">`;
    rewritten = rewritten.replace(/<link\s+rel=["']canonical["'][^>]*>/i, canonical);
  }

  return rewritten;
}

function copyRequestHeaders(req) {
  const headers = new Headers();
  for (const [key, raw] of Object.entries(req.headers)) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === 'host' || raw == null) continue;
    const value = Array.isArray(raw) ? raw.join(', ') : String(raw);
    headers.set(key, value);
  }
  headers.set('host', new URL(UPSTREAM_ORIGIN).host);
  headers.set('x-forwarded-host', publicHost(req));
  headers.set('x-forwarded-proto', publicProto(req));
  headers.set('x-neo-proxy', 'neo-society-dnnr');
  return headers;
}

async function readRequestBody(req) {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return chunks.length ? Buffer.concat(chunks) : undefined;
}

async function fetchUpstream(req, targetUrl, body) {
  let current = targetUrl;
  for (let i = 0; i <= MAX_REDIRECTS; i += 1) {
    const response = await fetch(current, {
      method: req.method,
      headers: copyRequestHeaders(req),
      body,
      redirect: 'manual',
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) return response;

    const next = new URL(location, current);
    const allowedHost = new URL(UPSTREAM_ORIGIN).host;
    if (next.host !== allowedHost) return response;

    if (i === MAX_REDIRECTS) {
      throw new Error(`Upstream redirect limit exceeded at ${next.href}`);
    }

    current = next.href;
  }
  throw new Error('Unreachable redirect state');
}

function setResponseHeaders(res, upstream, req) {
  for (const [key, value] of upstream.headers.entries()) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower) || lower === 'content-length' || lower === 'content-encoding') continue;
    if (lower === 'location') {
      res.setHeader(key, rewriteLocation(value, req));
      continue;
    }
    if (lower === 'set-cookie') continue;
    if (lower === 'content-security-policy' || lower === 'content-security-policy-report-only') {
      res.setHeader(key, value.split(UPSTREAM_ORIGIN).join(publicOrigin(req)));
      continue;
    }
    res.setHeader(key, value);
  }

  const cookies = upstream.headers.getSetCookie?.() || [];
  if (cookies.length) res.setHeader('set-cookie', cookies.map((cookie) => rewriteCookie(cookie, req)));

  res.setHeader('x-neo-route', publicHost(req) === LIFESTYLE_HOST ? 'lifestyle' : 'society');
  res.setHeader('x-neo-upstream', 'dnnr');
}

async function handler(req, res) {
  if (req.url === '/health' || req.url === '/_health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: true,
      service: 'neo-society-dnnr-proxy',
      upstream: UPSTREAM_ORIGIN,
      societyHost: SOCIETY_HOST,
      lifestyleHost: LIFESTYLE_HOST,
    }));
    return;
  }

  const host = publicHost(req);
  if (host && host !== SOCIETY_HOST && host !== LIFESTYLE_HOST && !host.endsWith('.run.app') && host !== 'localhost') {
    res.writeHead(421, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Misdirected Request');
    return;
  }

  try {
    const body = await readRequestBody(req);
    const targetUrl = new URL(upstreamPath(req), UPSTREAM_ORIGIN).href;
    const upstream = await fetchUpstream(req, targetUrl, body);
    setResponseHeaders(res, upstream, req);

    const contentType = upstream.headers.get('content-type') || '';
    const canRewrite = /text\/html|text\/css|javascript|application\/json|application\/manifest\+json/i.test(contentType);

    if (req.method === 'HEAD') {
      res.writeHead(upstream.status);
      res.end();
      return;
    }

    if (canRewrite) {
      const text = await upstream.text();
      const rewritten = rewriteText(text, contentType, req);
      res.writeHead(upstream.status);
      res.end(rewritten);
      return;
    }

    const data = Buffer.from(await upstream.arrayBuffer());
    res.writeHead(upstream.status);
    res.end(data);
  } catch (error) {
    console.error('neo-society-dnnr-proxy', error);
    res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: false,
      error: 'upstream_proxy_failure',
      message: error instanceof Error ? error.message : String(error),
    }));
  }
}

http.createServer(handler).listen(PORT, '0.0.0.0', () => {
  console.log(`neo-society-dnnr-proxy listening on :${PORT}`);
});
