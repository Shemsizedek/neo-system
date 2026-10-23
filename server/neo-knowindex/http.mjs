import { verifyNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs';
import { KnowledgeWriteError } from './ledger.mjs';

export const KNOWINDEX_ALLOWED_ORIGINS = new Set([
  'https://shemsizedek.github.io',
  'https://holytemples.org',
  'https://www.holytemples.org'
]);

function response(res, status, data, origin = '') {
  const payload = JSON.stringify(data);
  const headers = {
    'content-type': 'application/json; charset=utf-8',
    'content-length': String(Buffer.byteLength(payload)),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'content-security-policy': "default-src 'none'",
    'vary': 'Origin'
  };
  if (origin) headers['access-control-allow-origin'] = origin;
  res.writeHead(status, headers);
  res.end(payload);
}

async function parseJson(req) {
  if (!/^application\/json(?:;|$)/i.test(String(req.headers['content-type'] || ''))) {
    throw new KnowledgeWriteError('json_content_type_required', 415);
  }
  const declared = Number(req.headers['content-length']);
  if (declared > 12_000) throw new KnowledgeWriteError('request_too_large', 413);
  let total = 0;
  const chunks = [];
  for await (const chunk of req) {
    total += chunk.length;
    if (total > 12_000) throw new KnowledgeWriteError('request_too_large', 413);
    chunks.push(chunk);
  }
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid_object');
    return parsed;
  } catch {
    throw new KnowledgeWriteError('invalid_json', 400);
  }
}

function bearer(req) {
  const header = String(req.headers.authorization || '');
  const match = /^Bearer ([a-zA-Z0-9._-]+)$/.exec(header);
  return match ? match[1] : null;
}

export function createKnowindexContributionHttpHandler({
  ledger = null,
  authService = null,
  jwtSecret = '',
  jwtIssuer = 'neo-pass',
  enabled = false,
  allowedOrigins = KNOWINDEX_ALLOWED_ORIGINS,
  now = () => Date.now()
} = {}) {
  return async function handleKnowindex(req, res, url = new URL(req.url || '/', 'http://neo.local')) {
    const route = url.pathname;
    if (!route.startsWith('/api/v1/noogle/knowledge/')) return false;
    const origin = String(req.headers.origin || '');
    if (origin && !allowedOrigins.has(origin)) {
      response(res, 403, { error: 'origin_not_allowed' });
      return true;
    }
    if (!enabled || !ledger || !authService || typeof authService.session !== 'function' ||
        typeof jwtSecret !== 'string' || jwtSecret.length < 32) {
      response(res, 503, { error: 'knowindex_writes_not_configured', writesEnabled: false }, origin);
      return true;
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': origin || '',
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type,idempotency-key',
        'access-control-max-age': '300',
        'cache-control': 'no-store',
        'vary': 'Origin'
      });
      res.end();
      return true;
    }
    const jwt = bearer(req);
    const claims = jwt ? verifyNeopassToken(jwt, { secret: jwtSecret, issuer: jwtIssuer, now }) : null;
    const epoch = Math.floor(now() / 1000);
    if (!claims || !Number.isSafeInteger(claims.exp) || !Number.isSafeInteger(claims.iat) ||
        claims.exp <= epoch || claims.iat > epoch + 30 || claims.exp - claims.iat > 8 * 3600 + 30 ||
        (claims.token_use != null && claims.token_use !== 'neopass-session')) {
      response(res, 401, { error: 'verified_neopass_bearer_required' }, origin);
      return true;
    }
    let actor;
    try {
      const member = await authService.session(claims.sub, claims);
      if (!member || member.subject !== claims.sub || member.neopassStatus !== 'active') {
        throw new KnowledgeWriteError('active_verified_neopass_required', 403);
      }
      actor = { subject: member.subject, role: member.role || 'member', neopassStatus: 'active' };
    } catch (error) {
      const code = error instanceof KnowledgeWriteError ? error.code : 'neopass_registry_unavailable';
      response(res, error instanceof KnowledgeWriteError ? error.status : 503, { error: code }, origin);
      return true;
    }

    const base = '/api/v1/noogle/knowledge/contributions';
    const subroute = route.slice(base.length);
    try {
      if (route === base && req.method === 'POST') {
        const data = await parseJson(req);
        const key = req.headers['idempotency-key'];
        const record = ledger.submit(data, actor, key == null ? undefined : String(key));
        response(res, record.idempotentReplay ? 200 : 201, { contribution: record, reviewRequired: true, published: false }, origin);
        return true;
      }
      if (route === base && req.method === 'GET') {
        response(res, 405, { error: 'moderation_list_only' }, origin);
        return true;
      }
      if (route === '/api/v1/noogle/knowledge/moderation' && req.method === 'GET') {
        const records = ledger.list(actor, { state: url.searchParams.get('state') || 'submitted', limit: Number(url.searchParams.get('limit') || 30) });
        response(res, 200, { records, readOnly: true }, origin);
        return true;
      }
      const match = /^\/([0-9a-f-]{36})(?:\/(review|withdraw|audit))?$/.exec(subroute);
      if (match) {
        const [, id, operation] = match;
        if (!operation && req.method === 'GET') {
          response(res, 200, { contribution: ledger.read(id, actor), readOnly: true }, origin);
          return true;
        }
        if (operation === 'audit' && req.method === 'GET') {
          response(res, 200, { events: ledger.audit(id, actor), integrity: ledger.verifyAuditChain(), readOnly: true }, origin);
          return true;
        }
        if ((operation === 'review' || operation === 'withdraw') && req.method === 'POST') {
          const data = await parseJson(req);
          const change = ledger.change(id, actor, {
            action: operation === 'withdraw' ? 'withdraw' : data.action,
            note: data.note,
            expectedVersion: data.expectedVersion
          });
          response(res, 200, { contribution: change, published: false, reviewRequired: true }, origin);
          return true;
        }
      }
      response(res, ['GET', 'POST', 'OPTIONS'].includes(req.method) ? 404 : 405,
        { error: ['GET', 'POST', 'OPTIONS'].includes(req.method) ? 'not_found' : 'method_not_allowed' }, origin);
      return true;
    } catch (error) {
      if (error instanceof KnowledgeWriteError) {
        response(res, error.status, { error: error.code, published: false }, origin);
      } else {
        response(res, 503, { error: 'knowindex_store_unavailable', published: false }, origin);
      }
      return true;
    }
  };
}
