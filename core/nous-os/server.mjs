import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { identityFromEnv } from './identity.mjs';
import { createNousRuntime } from './runtime.mjs';
import { createReceiptStore } from './receipt-store.mjs';

const send = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(JSON.stringify(payload));
};

async function readBody(req) {
  const length = Number(req.headers['content-length']);
  if (Number.isFinite(length) && length > 32768) throw Object.assign(new Error('body_too_large'), { status: 413 });
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32768) throw Object.assign(new Error('body_too_large'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Object.assign(new Error('invalid_json'), { status: 400 }); }
}

export function createNousServer({ runtime } = {}) {
  if (!runtime) throw new TypeError('runtime_required');
  return createHttpServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (req.method === 'GET' && pathname === '/health') return send(res, 200, { service: 'neo-nous-os', status: 'alive', mode: 'plan-only' });
      if (req.method === 'GET' && pathname === '/ready') {
        const ready = runtime.identityReady();
        return send(res, ready ? 200 : 503, { service: 'neo-nous-os', identityConfigured: ready, adaptersConfigured: false, state: runtime.stateStatus(), mode: 'plan-only' });
      }
      if (req.method === 'GET' && pathname === '/v1/sources') return send(res, 200, runtime.listSources(req.headers.authorization));
      if (req.method === 'GET' && pathname === '/v1/agents') return send(res, 200, runtime.listAgents(req.headers.authorization));
      if (req.method === 'POST' && pathname === '/v1/tasks/plan') {
        const task = await readBody(req);
        return send(res, 200, runtime.plan(req.headers.authorization, task));
      }
      return send(res, 404, { error: 'not_found' });
    } catch (error) {
      const code = typeof error.code === 'string' ? error.code : (error.message === 'body_too_large' || error.message === 'invalid_json' ? error.message : 'internal_error');
      const status = Number.isInteger(error.status) ? error.status : 500;
      return send(res, status, { error: code });
    }
  });
}

export function startNousServer(env = process.env) {
  const identityVerifier = identityFromEnv(env);
  const receiptStore = env.NOUS_STATE_DIR ? createReceiptStore(env.NOUS_STATE_DIR) : null;
  const runtime = createNousRuntime({ identityVerifier, receiptStore, audit: event => process.stdout.write(JSON.stringify({ type: 'nous.audit', ...event }) + '\n') });
  const server = createNousServer({ runtime });
  server.requestTimeout = 10000;
  server.headersTimeout = 8000;
  server.listen(Number(env.PORT || 8080), env.NOUS_HOST || '127.0.0.1');
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) startNousServer();
