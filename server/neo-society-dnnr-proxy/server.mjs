import http from 'node:http';

const PORT = Number(process.env.PORT || 8080);
const SOCIETY_HOST = process.env.SOCIETY_HOST || 'society.holytemples.org';
const LIFESTYLE_HOST = process.env.LIFESTYLE_HOST || 'lifestyle.holytemples.org';
const SOCIETY_TARGET = process.env.SOCIETY_TARGET || 'https://neo.dnnr.io/';
const LIFESTYLE_TARGET = process.env.LIFESTYLE_TARGET || 'https://neo.dnnr.io/neo/ambassador-application';

function publicHost(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, '');
}

function redirectTarget(req) {
  const host = publicHost(req);
  const target = new URL(host === LIFESTYLE_HOST ? LIFESTYLE_TARGET : SOCIETY_TARGET);
  const incoming = new URL(req.url || '/', 'https://neo.invalid');

  // Society preserves non-root paths. Lifestyle's root intentionally lands on
  // the ambassador application; explicit subpaths are preserved.
  if (host === SOCIETY_HOST && incoming.pathname !== '/') {
    target.pathname = incoming.pathname;
  } else if (host === LIFESTYLE_HOST && incoming.pathname !== '/') {
    target.pathname = incoming.pathname;
  }
  target.search = incoming.search;
  target.hash = incoming.hash;
  return target.href;
}

function handler(req, res) {
  if (req.url === '/health' || req.url === '/_health') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      ok: true,
      service: 'neo-society-dnnr-redirect',
      societyHost: SOCIETY_HOST,
      lifestyleHost: LIFESTYLE_HOST,
      societyTarget: SOCIETY_TARGET,
      lifestyleTarget: LIFESTYLE_TARGET,
    }));
    return;
  }

  const host = publicHost(req);
  if (host && host !== SOCIETY_HOST && host !== LIFESTYLE_HOST && !host.endsWith('.run.app') && host !== 'localhost') {
    res.writeHead(421, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Misdirected Request');
    return;
  }

  const location = redirectTarget(req);
  res.writeHead(302, {
    location,
    'cache-control': 'public, max-age=300',
    'x-neo-route': host === LIFESTYLE_HOST ? 'lifestyle-redirect' : 'society-redirect',
  });
  res.end();
}

http.createServer(handler).listen(PORT, '0.0.0.0', () => {
  console.log(`neo-society-dnnr-redirect listening on :${PORT}`);
});
