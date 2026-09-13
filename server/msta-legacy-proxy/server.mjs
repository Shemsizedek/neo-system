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

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
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

function legacyNavigation(source) {
  const escapedSource = escapeHtml(source);
  return `<section class="neo-legacy-nav" aria-label="MSTA legacy navigation">
    <style>
      .neo-legacy-nav{box-sizing:border-box;position:relative;z-index:2147483646;margin:24px auto;padding:18px;max-width:1120px;border:1px solid rgba(214,182,101,.42);border-radius:18px;background:rgba(8,10,9,.96);color:#f3efe1;font:600 14px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-shadow:0 14px 40px rgba(0,0,0,.3)}
      .neo-legacy-nav *{box-sizing:border-box}.neo-legacy-nav__label{margin:0 0 12px;color:#d6b665;letter-spacing:.16em;text-transform:uppercase;font-size:11px}.neo-legacy-nav__actions{display:flex;flex-wrap:wrap;gap:10px}.neo-legacy-nav a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 15px;border:1px solid #d6b665;border-radius:999px;color:#f3efe1!important;background:#111512;text-decoration:none!important;font-weight:700}.neo-legacy-nav a:hover,.neo-legacy-nav a:focus-visible{background:#d6b665;color:#080a09!important;outline:none}.neo-legacy-nav a.neo-legacy-nav__source{border-color:#5b625b;color:#c9c2af!important}.neo-legacy-nav a.neo-legacy-nav__source:hover,.neo-legacy-nav a.neo-legacy-nav__source:focus-visible{background:#303730;color:#fff!important}.neo-legacy-nav__note{margin:12px 0 0;color:#aaa390;font-weight:500;font-size:12px}
    </style>
    <div class="neo-legacy-nav__label">MSTA Legacy Preservation</div>
    <div class="neo-legacy-nav__actions">
      <a href="${PUBLIC_ORIGIN}/moorish-parliament">Moorish Parliament</a>
      <a href="${PUBLIC_ORIGIN}/noone-society">Noone Society</a>
      <a class="neo-legacy-nav__source" href="${escapedSource}" target="_blank" rel="noopener noreferrer external">Original Legacy Source ↗</a>
      <a href="https://holytemples.org/">World Temple of Karast</a>
    </div>
    <p class="neo-legacy-nav__note">Preserved legacy navigation. Original-source access is clearly labeled and kept separate from the NEO-hosted preservation routes.</p>
  </section>`;
}

function injectLegacyNavigation(html, source) {
  const nav = legacyNavigation(source);
  if (/<\/body>/i.test(html)) return html.replace(/<\/body>/i, `${nav}</body>`);
  return `${html}${nav}`;
}

function unavailablePage(source) {
  const escaped = escapeHtml(source);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MSTA Legacy Preservation | World Temple of Karast</title><style>body{margin:0;background:#080a09;color:#f3efe1;font:16px/1.55 Georgia,serif}.wrap{max-width:760px;margin:10vh auto;padding:2rem}.mark{letter-spacing:.16em;text-transform:uppercase;color:#d6b665;font:700 12px/1.2 system-ui}h1{font-size:clamp(2.4rem,7vw,4.8rem);line-height:1;margin:.7rem 0 1rem}p{color:#c7c0af}code{word-break:break-all;color:#d6b665}.box{border:1px solid #373b36;padding:1.2rem;margin-top:1.5rem;background:#111512}</style></head><body><main class="wrap"><div class="mark">MSTA Legacy Preservation</div><h1>Source archive temporarily unavailable.</h1><p>The NEO preservation service has the original Noone Society / IM Creator address registered, but the legacy host did not answer this request. The source is not being replaced with invented content.</p><div class="box"><strong>Registered source</strong><br><code>${escaped}</code></div><p>When an IM Creator export, saved HTML, screenshot set, or archival snapshot is supplied, this route can serve the faithful preserved version directly from NEO infrastructure.</p></main>${legacyNavigation(source)}</body></html>`;
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

  if (/text\/html/i.test(type)) {
    const mirrored = rewriteText(await upstream.text());
    return send(res, upstream.status, injectLegacyNavigation(mirrored, source), headers);
  }

  if (/text\/(css|javascript)|application\/(javascript|json|xml|rss\+xml|atom\+xml)|image\/svg\+xml/i.test(type)) {
    return send(res, upstream.status, rewriteText(await upstream.text()), headers);
  }

  return send(res, upstream.status, Buffer.from(await upstream.arrayBuffer()), headers);
}

const port = Number(process.env.PORT || 8080);
http.createServer((req, res) => proxy(req, res).catch(error => {
  console.error('MSTA preservation proxy failure', error);
  send(res, 502, 'MSTA preservation proxy failure', { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
})).listen(port, () => console.log(`NEO MSTA legacy preservation proxy listening on :${port}`));
