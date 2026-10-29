import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { nmniReadiness, createNmniReadCredentialProvider } from './nmni-login-profile.mjs';
import { createCesSessionAdapter } from './ces-session-adapter.mjs';
import { resolveCesIdentity } from './bank-bot.mjs';

const json = (res, status, value) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(value)); };
function authorized(req, token) {
  if (!token || token.length < 32) return false;
  const actual = Buffer.from(req.headers.authorization || '');
  const expected = Buffer.from('Bearer ' + token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createCesReadServer({ env = process.env, store, fetchImpl = fetch, reader, now = () => new Date().toISOString() } = {}) {
  let busy = false;
  const read = reader || (async collect => {
    const adapter = createCesSessionAdapter({ credentialProvider: createNmniReadCredentialProvider(env), fetchImpl: (url, options) => fetchImpl(url, { ...options, signal: AbortSignal.timeout(20000) }) });
    return adapter.readNmniTradingStatistics({ exchange: resolveCesIdentity('NMNI'), collect });
  });
  return http.createServer(async (req, res) => {
    const path = new URL(req.url || '/', 'http://localhost').pathname;
    if (req.method === 'GET' && path === '/health') {
      let database = false;
      try { database = Boolean(await store?.ping()); } catch {}
      return json(res, 200, { ok: true, service: 'neo-ces-read-runtime', database, timestamp: now(), version: env.RENDER_GIT_COMMIT || 'local' });
    }
    if (!authorized(req, env.NEO_CES_RUNTIME_TOKEN)) return json(res, 401, { error: 'authentication_required' });
    if (req.headers.origin) return json(res, 403, { error: 'browser_origin_not_supported' });
    if (req.method === 'GET' && path === '/v1/status') return json(res, 200, { ...nmniReadiness(env), databaseConfigured: Boolean(store), financialWritesEnabled: false });
    if (req.method === 'GET' && path === '/v1/imports') {
      try { return json(res, 200, { imports: await store.list() }); } catch { return json(res, 503, { error: 'source_store_unavailable' }); }
    }
    if (req.method !== 'POST' || !['/v1/auth/check', '/v1/collect-import'].includes(path)) return json(res, 404, { error: 'not_found' });
    if (path === '/v1/collect-import' && env.NEO_CES_IMPORT_ENABLED !== 'true') return json(res, 403, { error: 'source_import_disabled' });
    if (!nmniReadiness(env).credentialsConfigured) return json(res, 503, { error: 'ces_credentials_not_configured' });
    if (busy) return json(res, 409, { error: 'collection_in_progress' });
    if (req.headers['transfer-encoding'] || Number(req.headers['content-length'] || 0) > 0) return json(res, 400, { error: 'request_body_not_supported' });
    busy = true;
    try {
      if (!store || !await store.ping()) return json(res, 503, { error: 'source_store_unavailable' });
      const result = await read(path === '/v1/collect-import');
      if (result?.proof?.adminAuthenticated !== true || result.proof.memberAuthenticated !== true || result.proof.exchangeId !== 'NMNI') return json(res, 502, { error: 'ces_administrator_verification_failed' });
      if (path === '/v1/auth/check') return json(res, 200, { proof: result.proof });
      const imported = await store.importSnapshot(result.snapshot);
      return json(res, 200, { proof: result.proof, import: imported });
    } catch {
      // CES errors may contain credential-bearing navigation URLs. Never return
      // or log the underlying exception, HTML, session material or secrets.
      return json(res, 502, { error: 'ces_read_or_import_failed' });
    } finally { busy = false; }
  });
}
