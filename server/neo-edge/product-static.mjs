import { readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const RELATIONS_ROOT = fileURLToPath(new URL('../../apps/neo-relations/site/', import.meta.url));
const EXCHANGE_ROOT = fileURLToPath(new URL('../../apps/neo-exchange/dist/', import.meta.url));
const FINANCE_FILE = fileURLToPath(new URL('../../apps/noogle/web/finance.html', import.meta.url));
const TELLER_ROOT = fileURLToPath(new URL('../../public/neo-teller/', import.meta.url));
const PLATFORM_SHELL_CSS = fileURLToPath(new URL('../../public/platform-shell.css', import.meta.url));
const PLATFORM_SHELL_JS = fileURLToPath(new URL('../../public/platform-shell.js', import.meta.url));

const RELATIONS_FILES = Object.freeze({
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/ui': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/data/tenants.json': ['data/tenants.json', 'application/json; charset=utf-8'],
  '/data/status.json': ['data/status.json', 'application/json; charset=utf-8']
});

const CONTENT_TYPES = Object.freeze({
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
});

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

async function serveFile(req, res, absolutePath, contentType) {
  try {
    const body = await readFile(absolutePath);
    res.writeHead(200, {
      'content-type': contentType,
      'cache-control': contentType.startsWith('text/html') ? 'no-store' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(body);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    json(res, 500, { error: 'product_asset_unavailable', detail: String(error?.message || error) });
    return true;
  }
}

async function serveRelations(req, res, url, host) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-relations' });
    return true;
  }
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-relations', mode: 'live-production', host });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, { service: 'neo-relations', name: 'NEO Relations', role: 'crm', mode: 'live-production', ui: 'https://relations.holytemples.org/' });
    return true;
  }
  const entry = RELATIONS_FILES[url.pathname];
  if (!entry) {
    json(res, 404, { error: 'not_found', service: 'neo-relations', path: url.pathname });
    return true;
  }
  const [relativePath, contentType] = entry;
  const served = await serveFile(req, res, `${RELATIONS_ROOT}${relativePath}`, contentType);
  if (!served) json(res, 500, { error: 'neo_relations_asset_unavailable', path: relativePath });
  return true;
}

async function serveExchange(req, res, url, host) {
  if (url.pathname.startsWith('/api/neo-exchange/')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-exchange', mode: 'live-production', host });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, { service: 'neo-exchange', name: 'NEO Exchange', role: 'markets', mode: 'live-production', marketData: '/api/neo-exchange/markets', ui: 'https://neofx.holytemples.org/' });
    return true;
  }

  const pathname = url.pathname === '/' || url.pathname === '/ui' ? '/index.html' : decodeURIComponent(url.pathname);
  const candidate = resolve(EXCHANGE_ROOT, `.${pathname}`);
  const safeRoot = resolve(EXCHANGE_ROOT) + sep;
  if (!candidate.startsWith(safeRoot) && candidate !== resolve(EXCHANGE_ROOT, 'index.html')) {
    json(res, 400, { error: 'invalid_path', service: 'neo-exchange' });
    return true;
  }
  const contentType = CONTENT_TYPES[extname(candidate).toLowerCase()] || 'application/octet-stream';
  const served = await serveFile(req, res, candidate, contentType);
  if (served) return true;
  if (!extname(pathname)) {
    const fallback = await serveFile(req, res, resolve(EXCHANGE_ROOT, 'index.html'), 'text/html; charset=utf-8');
    if (fallback) return true;
  }
  json(res, 404, { error: 'not_found', service: 'neo-exchange', path: url.pathname });
  return true;
}

async function serveFinance(req, res, url, host) {
  if (url.pathname.startsWith('/api/neo-exchange/')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'noogle-finance', mode: 'live-production', marketData: 'neo-exchange', host });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, { service: 'noogle-finance', name: 'Noogle Finance', role: 'market-intelligence', mode: 'live-production', marketData: '/api/neo-exchange/markets', ui: 'https://finance.holytemples.org/' });
    return true;
  }
  if (url.pathname === '/' || url.pathname === '/ui' || url.pathname === '/index.html') {
    const served = await serveFile(req, res, FINANCE_FILE, 'text/html; charset=utf-8');
    if (!served) json(res, 500, { error: 'noogle_finance_ui_unavailable' });
    return true;
  }
  json(res, 404, { error: 'not_found', service: 'noogle-finance', path: url.pathname });
  return true;
}

async function serveTeller(req, res, url, host) {
  if (url.pathname.startsWith('/api/v1/teller/')) return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-teller', mode: 'READ_ONLY', host, network: '/api/v1/teller/network' });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, { service: 'neo-teller', name: 'NEO Teller', role: 'atm-terminal-platform', mode: 'READ_ONLY', liveData: '/api/v1/teller/network', signing: false, broadcast: false, ui: 'https://teller.holytemples.org/' });
    return true;
  }
  if (url.pathname === '/neo-system/api/platforms/neo-teller.json' || url.pathname === '/api/platforms/neo-teller.json') {
    json(res, 200, {
      id: 'neo-teller',
      name: 'NEO Teller',
      status: 'ready',
      generatedAt: new Date().toISOString(),
      endpoint: '/api/v1/teller/network',
      capabilities: [
        { name: 'Bitcoin network telemetry', mode: 'LIVE / READ_ONLY' },
        { name: 'Counterparty asset telemetry', mode: 'LIVE / READ_ONLY' },
        { name: 'ATM session architecture', mode: 'UI / POLICY GATED' },
        { name: 'Signing and broadcast', mode: 'DISABLED' }
      ]
    });
    return true;
  }
  if (url.pathname === '/platform-shell.css') return serveFile(req, res, PLATFORM_SHELL_CSS, 'text/css; charset=utf-8');
  if (url.pathname === '/platform-shell.js') return serveFile(req, res, PLATFORM_SHELL_JS, 'text/javascript; charset=utf-8');
  if (url.pathname === '/' || url.pathname === '/ui' || url.pathname === '/index.html') {
    const served = await serveFile(req, res, resolve(TELLER_ROOT, 'index.html'), 'text/html; charset=utf-8');
    if (!served) json(res, 500, { error: 'neo_teller_ui_unavailable' });
    return true;
  }
  json(res, 404, { error: 'not_found', service: 'neo-teller', path: url.pathname });
  return true;
}

export async function serveProductStatic(req, res, url, host) {
  if (host === 'relations.holytemples.org') return serveRelations(req, res, url, host);
  if (host === 'neofx.holytemples.org') return serveExchange(req, res, url, host);
  if (host === 'finance.holytemples.org') return serveFinance(req, res, url, host);
  if (host === 'teller.holytemples.org') return serveTeller(req, res, url, host);
  return false;
}
