import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const RELATIONS_ROOT = fileURLToPath(new URL('../../apps/neo-relations/site/', import.meta.url));
const RELATIONS_FILES = Object.freeze({
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/ui': ['index.html', 'text/html; charset=utf-8'],
  '/index.html': ['index.html', 'text/html; charset=utf-8'],
  '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
  '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  '/data/tenants.json': ['data/tenants.json', 'application/json; charset=utf-8'],
  '/data/status.json': ['data/status.json', 'application/json; charset=utf-8']
});

function json(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

export async function serveProductStatic(req, res, url, host) {
  if (host !== 'relations.holytemples.org') return false;
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    json(res, 405, { error: 'method_not_allowed', service: 'neo-relations' });
    return true;
  }
  if (url.pathname === '/health') {
    json(res, 200, { ok: true, service: 'neo-relations', mode: 'live-production', host });
    return true;
  }
  if (url.pathname === '/api') {
    json(res, 200, {
      service: 'neo-relations',
      name: 'NEO Relations',
      role: 'crm',
      mode: 'live-production',
      ui: 'https://relations.holytemples.org/'
    });
    return true;
  }
  const entry = RELATIONS_FILES[url.pathname];
  if (!entry) {
    json(res, 404, { error: 'not_found', service: 'neo-relations', path: url.pathname });
    return true;
  }
  const [relativePath, contentType] = entry;
  try {
    const body = await readFile(`${RELATIONS_ROOT}${relativePath}`);
    res.writeHead(200, {
      'content-type': contentType,
      'cache-control': contentType.startsWith('text/html') ? 'no-store' : 'public, max-age=300',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin'
    });
    if (req.method === 'HEAD') return res.end();
    res.end(body);
  } catch (error) {
    json(res, 500, { error: 'neo_relations_asset_unavailable', detail: String(error?.message || error) });
  }
  return true;
}
