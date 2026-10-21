import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const banner = '<aside aria-label="Staging environment" style="padding:12px 18px;background:#fff0bc;color:#241d00;font:14px/1.5 system-ui;text-align:center;border-bottom:1px solid #9a822c">NEO STAGING · Public frontend preview · Backend actions are unavailable. External links may open production sites.</aside>';
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
  '.pdf': 'application/pdf', '.wasm': 'application/wasm'
};
const headers = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'no-referrer',
  'content-security-policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https:; font-src 'self' data:; object-src 'none'; frame-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'"
};

export function createStagingServer({root = resolve(repository, 'dist'), revision = process.env.RENDER_GIT_COMMIT || 'local'} = {}) {
  root = resolve(root);
  return http.createServer(async (req, res) => {
    const send = (status, body, type = 'application/json; charset=utf-8', extra = {}) => {
      const bytes = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
      res.writeHead(status, {...headers, ...extra, 'content-type': type, 'content-length': bytes.length});
      res.end(req.method === 'HEAD' ? undefined : bytes);
    };
    if (!['GET', 'HEAD'].includes(req.method)) {
      req.resume();
      return send(405, {error: 'staging_read_only'}, undefined, {allow: 'GET, HEAD'});
    }
    let path;
    try {
      path = decodeURIComponent((req.url || '/').split('?')[0]);
      if (!path.startsWith('/') || path.includes('\\') || path.includes('\0') || path.split('/').some(part => part.startsWith('.'))) throw Error();
    } catch {
      return send(400, {error: 'invalid_path'});
    }
    if (['/healthz', '/health', '/api/staging'].includes(path)) {
      let ready = false;
      try { ready = (await stat(resolve(root, 'index.html'))).isFile(); } catch {}
      return send(ready ? 200 : 503, {
        ok: ready, service: 'neo-system-staging', environment: 'staging',
        revision, frontend: ready ? 'ready' : 'missing_build',
        backend: 'not_connected', writes: false
      });
    }
    let target = resolve(root, '.' + path);
    if (target !== root && !target.startsWith(root + sep)) return send(400, {error: 'invalid_path'});
    try {
      if ((await stat(target)).isDirectory()) target = resolve(target, 'index.html');
      if (!(await stat(target)).isFile()) throw Error();
    } catch {
      if (path === '/api' || path.startsWith('/api/')) return send(503, {error: 'staging_backend_not_connected'});
      if (extname(path) || !req.headers.accept?.includes('text/html')) return send(404, {error: 'not_found'});
      target = resolve(root, 'index.html');
    }
    try {
      let body = await readFile(target);
      const ext = extname(target).toLowerCase();
      if (ext === '.html') body = Buffer.from(body.toString('utf8').replace(/<body\b[^>]*>/i, match => match + banner));
      return send(200, body, types[ext] || 'application/octet-stream');
    } catch {
      return send(503, {error: 'staging_build_unavailable'});
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 10000);
  const server = createStagingServer();
  server.listen(port, '0.0.0.0', () => console.log(`NEO staging listening on ${port}`));
  const shutdown = () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
