import { readFileSync } from 'node:fs';

export const NOUS_ACCESS_PAGE = '/neopass/nous-access';
const routes = Object.freeze({
  [NOUS_ACCESS_PAGE]: { path: './assets/nous-consent.html', contentType: 'text/html; charset=utf-8' },
  '/neopass/nous-access.css': { path: './assets/nous-consent.css', contentType: 'text/css; charset=utf-8' },
  '/neopass/nous-access.js': { path: './assets/nous-consent.js', contentType: 'text/javascript; charset=utf-8' },
});

/** Staging-only, explicitly enabled same-origin static UI with restrictive CSP. */
export function createNousConsentPageHandler({ enabled = false, reader = readFileSync } = {}) {
  return (req, res, url) => {
    const route = routes[url.pathname];
    if (!route) return false;
    if (!enabled) {
      res.writeHead(404, { 'cache-control': 'no-store' }); res.end(); return true;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'cache-control': 'no-store' }); res.end(); return true;
    }
    let content;
    try { content = reader(new URL(route.path, import.meta.url)); }
    catch { res.writeHead(503, { 'cache-control': 'no-store' }); res.end(); return true; }
    res.writeHead(200, {
      'content-type': route.contentType,
      'cache-control': 'no-store, private',
      'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY',
      'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    });
    res.end(req.method === 'HEAD' ? undefined : content);
    return true;
  };
}
