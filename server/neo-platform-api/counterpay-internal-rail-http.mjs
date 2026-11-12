import {prepareCounterpayInternalBatch} from './counterpay-internal-rail-core.mjs';

/** Bound to trusted NEOpass subject resolver and existing eGaaS anchor preparer.
 * This endpoint is disabled by default and cannot sign, spend, store, or broadcast.
 */
export function createCounterpayInternalRailHandler({subjectResolver, prepareAnchor, enabled = false} = {}) {
  if (typeof subjectResolver !== 'function' || typeof prepareAnchor !== 'function') throw new TypeError('internal_rail_dependencies_required');
  return async (req, res, url) => {
    if (url.pathname !== '/api/v1/egaas/internal-rail/prepare') return false;
    const reply = (status, data) => {
      const body = JSON.stringify(data);
      res.writeHead(status, {
        'content-type': 'application/json; charset=utf-8',
        'content-length': Buffer.byteLength(body),
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
        'referrer-policy': 'no-referrer',
      });
      res.end(body);
      return true;
    };
    if (!enabled) return reply(503, {error: 'internal_rail_preparation_disabled'});
    if (req.method !== 'POST') return reply(405, {error: 'method_not_allowed'});
    try { if (!subjectResolver(req)) return reply(401, {error: 'neopass_identity_required'}); }
    catch { return reply(401, {error: 'neopass_identity_required'}); }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] || '')) return reply(415, {error: 'application_json_required'});
    let raw = '', length = 0;
    for await (const chunk of req) {
      length += chunk.byteLength;
      if (length > 65536) return reply(413, {error: 'request_too_large'});
      raw += chunk;
    }
    try { return reply(200, prepareCounterpayInternalBatch(JSON.parse(raw), {prepareAnchor})); }
    catch { return reply(400, {error: 'invalid_internal_rail_batch'}); }
  };
}
