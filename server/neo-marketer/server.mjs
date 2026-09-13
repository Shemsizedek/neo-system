import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexPath = join(__dirname, 'public', 'index.html');

export function createMarketerServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');

    if (url.pathname === '/health') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ ok: true, service: 'neo-marketer', domain: 'marketer.holytemples.org' }));
      return;
    }

    if (url.pathname === '/api/marketer/status') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({
        ok: true,
        service: 'NEO Marketer',
        mode: 'production',
        modules: [
          'brand-intelligence',
          'audience-intelligence',
          'campaign-architect',
          'creative-director',
          'copy-content-engine',
          'video-marketer',
          'social-distribution',
          'seo-search-intelligence',
          'email-crm-campaigns',
          'paid-media-intelligence',
          'partnership-discovery',
          'competitive-teardowns',
          'analytics-attribution'
        ]
      }));
      return;
    }

    if (url.pathname !== '/') {
      res.writeHead(404, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'not_found' }));
      return;
    }

    try {
      const html = await readFile(indexPath, 'utf8');
      res.writeHead(200, {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=300',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'strict-origin-when-cross-origin'
      });
      res.end(html);
    } catch (error) {
      res.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'ui_unavailable' }));
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 8080);
  createMarketerServer().listen(port, '0.0.0.0', () => {
    console.log(`NEO Marketer listening on ${port}`);
  });
}
