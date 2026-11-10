import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { identityFromEnv } from './identity.mjs';
import { createNousRuntime } from './runtime.mjs';
import { createReceiptStore } from './receipt-store.mjs';
import { createPostgresReceiptStore } from './postgres-receipts.mjs';
import { createRequestGate } from './rate-limit.mjs';
import { createStagingOidcVerifier } from './github-oidc.mjs';
import { createStagingOidcVerifier } from './github-oidc.mjs';
import { createStagingOidcVerifier } from './github-oidc.mjs';

const send = (res, status, payload) => {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
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

export function createNousServer({ runtime, requestGate = createRequestGate(), stagingOidcVerifier = null } = {}) {
  if (!runtime) throw new TypeError('runtime_required');
  return createHttpServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, 'http://localhost').pathname;
      if (pathname.startsWith('/v1/') && !requestGate.allow(req.socket?.remoteAddress || 'unknown')) return send(res, 429, { error: 'rate_limit_exceeded' });
      if (req.method === 'GET' && pathname === '/health') return send(res, 200, { service: 'neo-nous-os', status: 'alive', mode: 'plan-only' });
      if (req.method === 'GET' && pathname === '/ready') {
        const ready = runtime.identityReady() && await runtime.stateReady();
        return send(res, ready ? 200 : 503, { service: 'neo-nous-os', identityConfigured: ready, adaptersConfigured: false, state: runtime.stateStatus(), mode: 'plan-only' });
      }
      if (pathname === '/v1/staging/receipts/plan') {
        if (!stagingOidcVerifier) return send(res, 404, { error: 'not_found' });
        if (req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' });
        // Only GitHub's signed OIDC token from the exact approved staging PR workflow.
        const identity = await stagingOidcVerifier.verifyAuthorization(req.headers.authorization);
        const input = await readBody(req);
        if (!input || typeof input !== 'object' || Array.isArray(input) ||
            typeof input.requestId !== 'string' || !/^NOUS-OIDC-[A-Za-z0-9-]{1,48}$/.test(input.requestId) ||
            Object.keys(input).some(key => key !== 'requestId')) {
          return send(res, 400, { error: 'invalid_staging_receipt_request' });
        }
        // Fixed non-executing fixture only: OIDC cannot select a capability or agent.
        const task = { requestId: input.requestId, agentId: 'NIA-008', capability: 'development.plan' };
        return send(res, 200, await runtime.planHostedIdentity(identity, task));
      }
      if (req.method === 'POST' && pathname === '/v1/staging/plan' && stagingOidc) {
        const identity = await stagingOidc.verifyAuthorization(req.headers.authorization);
        const task = await readBody(req);
        return send(res, 200, await runtime.planHostedIdentity(identity, task));
      }
      if (req.method === 'POST' && pathname === '/v1/staging/receipt') {
        if (!stagingOidcVerifier) return send(res, 404, { error: 'not_found' });
        // Authenticate BEFORE reading the body to prevent anonymous storage writes.
        const identity = await stagingOidcVerifier.verifyAuthorization(req.headers.authorization);
        const body = await readBody(req);
        if (!body || Object.keys(body).length !== 1 || typeof body.requestId !== 'string' ||
            !/^CI-P144-[A-Z0-9-]{1,60}$/.test(body.requestId)) return send(res, 400, { error: 'invalid_staging_request' });
        return send(res, 200, await runtime.planHostedIdentity(identity, {
          requestId: body.requestId, agentId: 'NIA-008', capability: 'development.plan',
        }));
      }
      if (req.method === 'GET' && pathname === '/v1/adapters') return send(res, 200, runtime.listAdapters(req.headers.authorization));
      if (req.method === 'POST' && pathname === '/v1/adapters/classify') {
        const input = await readBody(req);
        return send(res, 200, runtime.classifyAdapter(req.headers.authorization, input));
      }
      if (req.method === 'GET' && pathname === '/v1/sources') return send(res, 200, runtime.listSources(req.headers.authorization));
      if (req.method === 'GET' && pathname === '/v1/agents') return send(res, 200, runtime.listAgents(req.headers.authorization));
      if (req.method === 'POST' && pathname === '/v1/tasks/plan') {
        const task = await readBody(req);
        return send(res, 200, await (runtime.stateStatus().backend === 'postgresql' ? runtime.planHosted(req.headers.authorization, task) : runtime.plan(req.headers.authorization, task)));
      }
      return send(res, 404, { error: 'not_found' });
    } catch (error) {
      const code = typeof error.code === 'string' ? error.code : (error.message === 'body_too_large' || error.message === 'invalid_json' ? error.message : 'internal_error');
      const status = Number.isInteger(error.status) ? error.status : 500;
      return send(res, status, { error: code });
    }
  });
}

export async function startNousServer(env = process.env) {
  const identityVerifier = identityFromEnv(env);
  const postgresReceiptStore = env.NOUS_DATABASE_URL ? await createPostgresReceiptStore({ connectionString: env.NOUS_DATABASE_URL }) : null;
  const receiptStore = !postgresReceiptStore && env.NOUS_STATE_DIR ? createReceiptStore(env.NOUS_STATE_DIR) : null;
  const runtime = createNousRuntime({ identityVerifier, receiptStore, postgresReceiptStore, audit: event => process.stdout.write(JSON.stringify({ type: 'nous.audit', ...event }) + '\n') });
  const stagingOidcVerifier =
    env.NOUS_STAGE === 'neon-locked-staging' &&
    env.NOUS_STAGING_GITHUB_OIDC_ENABLED === 'true' &&
    postgresReceiptStore && identityVerifier.configured
      ? createStagingOidcVerifier()
      : null;
  const server = createNousServer({ runtime, stagingOidcVerifier });
  server.requestTimeout = 10000;
  server.headersTimeout = 8000;
  server.listen(Number(env.PORT || 8080), env.NOUS_HOST || '127.0.0.1');
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) startNousServer().catch(error => { console.error('nous_startup_failed', error?.code || error?.message || 'unknown'); process.exitCode = 1; });
