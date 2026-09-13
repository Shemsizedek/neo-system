import http from 'node:http';

const PUBLIC_ORIGIN = 'https://msta.holytemples.org';
const SERVICE_NAME = 'neo-msta-legacy';
const LEGACY_PAGES = Object.freeze({
  '/': 'https://www.im-creator.com/free/noonesociety/moorish_parliament',
  '/moorish-parliament': 'https://www.im-creator.com/free/noonesociety/moorish_parliament',
  '/noone-society': 'http://www.im-creator.com/free/noonesociety/noone-society',
});

const HOP_BY_HOP = new Set([
  'connection','keep-alive','proxy-authenticate','proxy-authorization',
  'te','trailer','transfer-encoding','upgrade','host','content-length'
]);

function send(res, status, body, headers = {}) {
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(String(body));
  res.writeHead(status, {
    'content-length': payload.length,
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    ...headers,
  });
  res.end(payload);
}

function copyRequestHeaders(req, target) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null || HOP_BY_HOP.has(key.toLowerCase())) continue;
    headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }
  headers.set('host', target.host);
  headers.set('x-forwarded-host', 'msta.holytemples.org');
  headers.set('x-forwarded-proto', 'https');
  headers.set('user-agent', headers.get('user-agent') || 'NEO-MSTA-Preservation/1.0 (+https://holytemples.org)');
  return headers;
}

function rewriteText(value = '') {
  return String(value)
    .replaceAll('https://www.im-creator.com/free/noonesociety/moorish_parliament', `${PUBLIC_ORIGIN}/`)
    .replaceAll('http://www.im-creator.com/free/noonesociety/moorish_parliament', `${PUBLIC_ORIGIN}/`)
    .replaceAll('https://www.im-creator.com/free/noonesociety/noone-society', `${PUBLIC_ORIGIN}/noone-society`)
    .replaceAll('http://www.im-creator.com/free/noonesociety/noone-society', `${PUBLIC_ORIGIN}/noone-society`);
}

function unavailablePage(source) {
  const escaped = source.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MSTA Legacy Preservation | World Temple of Karast</title><style>body{margin:0;background:#080a09;color:#f3efe1;font:16px/1.55 Georgia,serif}.wrap{max-width:760px;margin:10vh auto;padding:2rem}.mark{letter-spacing:.16em;text-transform:uppercase;color:#d6b665;font:700 12px/1.2 system-ui}h1{font-size:clamp(2.4rem,7vw,4.8rem);line-height:1;margin:.7rem 0 1rem}p{color:#c7c0af}code{word-break:break-all;color:#d6b665}.box{border:1px solid #373b36;padding:1.2rem;margin-top:1.5rem;background:#111512}a{color:#d6b665}</style></head><body><main class="wrap"><div class="mark">MSTA Legacy Preservation</div><h1>Source archive temporarily unavailable.</h1><p>The NEO preservation service has the original Noone Society / IM Creator address registered, but the legacy host did not answer this request. The source is not being replaced with invented content.</p><div class="box"><strong>Registered source</strong><br><code>${escaped}</code></div><p>When an IM Creator export, saved HTML, screenshot set, or archival snapshot is supplied, this route can serve the faithful preserved version directly from NEO infrastructure.</p><p><a href="https://holytemples.org/">Return to World Temple of Karast</a></p></main></body></html>`;
}

async function proxy(req, res) {
  const incoming = new URL(req.url || '/', PUBLIC_ORIGIN);
  if (incoming.pathname === '/health') {
    return send(res, 200, JSON.stringify({
      service: SERVICE_NAME,
      status: 'ok',
      public: PUBLIC_ORIGIN,
      mode: 'mirror-first-preservation-fallback',
      legacyPages: LEGACY_PAGES,
    }), { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  }

  const source = LEGACY_PAGES[incoming.pathname] || LEGACY_PAGES['/'];
  const target = new URL(source);
  if (incoming.search) target.search = incoming.search;

  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers: copyRequestHeaders(req, target),
      redirect: 'manual',
      signal: AbortSignal.timeout(12000),
    });
  } catch (error) {
    console.error('MSTA legacy upstream unavailable', error?.message || error);
    return send(res, 200, unavailablePage(source), {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-neo-preservation-source': source,
      'x-neo-preservation-mode': 'fallback',
    });
  }

  if (upstream.status >= 300 && upstream.status < 400) {
    const location = upstream.headers.get('location');
    if (location) {
      const next = new URL(location, target);
      const mapped = rewriteText(next.toString());
      res.writeHead(upstream.status, {
        location: mapped,
        'cache-control': 'no-store',
        'x-neo-preservation-mode': 'mirror',
      });
      return res.end();
    }
  }

  const type = upstream.headers.get('content-type') || 'application/octet-stream';
  const headers = {
    'content-type': type,
    'cache-control': upstream.headers.get('cache-control') || 'public, max-age=120',
    'x-neo-preservation-source': source,
    'x-neo-preservation-mode': 'mirror',
  };

  if (req.method === 'HEAD') {
    res.writeHead(upstream.status, headers);
    return res.end();
  }

  if (/text\/(html|css|javascript)|application\/(javascript|json|xml|rss\+xml|atom\+xml)|image\/svg\+xml/i.test(type)) {
    return send(res, upstream.status, rewriteText(await upstream.text()), headers);
  }

  return send(res, upstream.status, Buffer.from(await upstream.arrayBuffer()), headers);
}

const port = Number(process.env.PORT || 8080);
http.createServer((req, res) => proxy(req, res).catch(error => {
  console.error('MSTA preservation proxy failure', error);
  send(res, 502, 'MSTA preservation proxy failure', { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
})).listen(port, () => console.log(`NEO MSTA legacy preservation proxy listening on :${port}`));
