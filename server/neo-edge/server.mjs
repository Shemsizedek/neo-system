import http from 'node:http';
import { URL } from 'node:url';
import { searchPublicLibrary, libraryCatalog, health as libraryHealth } from '../holytemples-adapter/adapter.mjs';

const PORT = Number(process.env.PORT || 8080);

const SERVICES = Object.freeze({
  'neo.holytemples.org': { id: 'neo-system', name: 'NEO System', role: 'system', api: true },
  'router.holytemples.org': { id: 'neo-router', name: 'NEO Router', role: 'router', api: true },
  'algo.holytemples.org': { id: 'neo-algo', name: 'NEO Algo', role: 'intelligence', api: true },
  'prime.holytemples.org': { id: 'neo-prime', name: 'NEO Prime', role: 'orchestrator', api: true },
  'pay.holytemples.org': { id: 'neopay', name: 'NEO Pay', role: 'payments', api: true },
  'hub.holytemples.org': { id: 'neo-hub', name: 'NEO Hub', role: 'hub', api: true },
  'counter.holytemples.org': { id: 'neo-counter', name: 'NEO Counter', role: 'commerce', api: true },
  'wire.holytemples.org': { id: 'neo-wire', name: 'NEO Wire', role: 'wire', api: true },
  'neogram.holytemples.org': { id: 'neogram', name: 'NEO Telegram', role: 'communications', api: true },
  'neofx.holytemples.org': { id: 'neofx', name: 'NEOfx', role: 'exchange', api: true },
  'scan.holytemples.org': { id: 'neoscan', name: 'NEO Scan', role: 'explorer', api: true },
  'school.holytemples.org': { id: 'gisd', name: 'GISD', role: 'education', api: true },
  'library.holytemples.org': { id: 'neo-library', name: 'NEO Library', role: 'library', api: true },
  'book.holytemples.org': { id: 'neo-books', name: 'NEO Books', role: 'books', api: true },
  'neopads.holytemples.org': { id: 'neo-pads', name: 'NEO Pads', role: 'hospitality', api: true },
  'neopass.holytemples.org': { id: 'neopass', name: 'NEO Pass', role: 'identity', api: true },
  'neovision.holytemples.org': { id: 'neo-tv', name: 'NEO TV', role: 'media', api: true },
  'noogle.holytemples.org': { id: 'noogle', name: 'Noogle', role: 'search', api: true },
  'omnitrix.holytemples.org': { id: 'omnitrix', name: 'Omnitrix', role: 'browser', api: true },
  'neodash.holytemples.org': { id: 'neo-dash', name: 'NEO Dash', role: 'dashboard', api: true }
});

const PUBLIC_ORIGINS = new Set([
  'https://holytemples.org',
  'https://www.holytemples.org',
  ...Object.keys(SERVICES).map(host => `https://${host}`)
]);

function hostOf(req) {
  return String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim()
    .split(':')[0]
    .toLowerCase();
}

function cors(req, res) {
  const origin = req.headers.origin;
  if (origin && PUBLIC_ORIGINS.has(origin)) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('vary', 'Origin');
    res.setHeader('access-control-allow-methods', 'GET,OPTIONS');
    res.setHeader('access-control-allow-headers', 'Accept,Content-Type');
  }
}

function json(req, res, status, body) {
  cors(req, res);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': status === 200 ? 'public, max-age=30' : 'no-store'
  });
  res.end(JSON.stringify(body));
}

function serviceSnapshot(host) {
  const service = SERVICES[host];
  return service ? { ...service, host, url: `https://${host}` } : null;
}

function systemManifest() {
  return {
    system: 'NEO System',
    mode: 'live-production',
    edge: 'neo-edge',
    services: Object.keys(SERVICES).map(serviceSnapshot),
    publicSearch: '/noogle/search?q=',
    policy: {
      publicLibraryOnly: true,
      protectedResourcesRemainServerSide: true,
      runtimeSecretsInBrowser: false
    }
  };
}

export function createNeoEdgeServer() {
  return http.createServer(async (req, res) => {
    if (req.method === 'OPTIONS') {
      cors(req, res);
      res.writeHead(204);
      return res.end();
    }

    const host = hostOf(req);
    const service = serviceSnapshot(host);
    const url = new URL(req.url || '/', `https://${host || 'neo.holytemples.org'}`);

    if (!service) return json(req, res, 421, { error: 'unknown_neo_host', host });

    if (req.method === 'GET' && url.pathname === '/health') {
      return json(req, res, 200, {
        ok: true,
        observedAt: new Date().toISOString(),
        edge: 'neo-edge',
        service,
        library: libraryHealth()
      });
    }

    if (req.method === 'GET' && url.pathname === '/api') {
      return json(req, res, 200, { service, system: systemManifest() });
    }

    if (req.method === 'GET' && url.pathname === '/services') {
      return json(req, res, 200, systemManifest());
    }

    if (req.method === 'GET' && (url.pathname === '/library' || url.pathname === '/api/library')) {
      return json(req, res, 200, { records: libraryCatalog(), accessClass: 'PUBLIC_WORLD_LIBRARY' });
    }

    if (req.method === 'GET' && (url.pathname === '/noogle/search' || url.pathname === '/api/noogle/search')) {
      const q = String(url.searchParams.get('q') || '').trim();
      if (!q) return json(req, res, 400, { error: 'query_required', parameter: 'q' });
      const records = searchPublicLibrary(q);
      return json(req, res, 200, {
        query: q,
        records,
        count: records.length,
        engine: 'Noogle public library search',
        accessClass: 'PUBLIC_WORLD_LIBRARY'
      });
    }

    if (req.method === 'GET' && url.pathname === '/') {
      return json(req, res, 200, {
        service,
        system: 'NEO System',
        status: 'online',
        endpoints: ['/health', '/api', '/services', '/library', '/noogle/search?q=']
      });
    }

    return json(req, res, 404, { error: 'not_found', service: service.id, path: url.pathname });
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  createNeoEdgeServer().listen(PORT, '0.0.0.0', () => {
    console.log(`NEO edge listening on 0.0.0.0:${PORT}`);
  });
}
