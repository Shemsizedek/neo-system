import { timingSafeEqual } from 'node:crypto';
import { BankSourceError, createBankSourceClient } from './source-client.mjs';

const send = (res, status, body) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }); res.end(JSON.stringify(body)); };
export function sendSourceError(res, error) {
  return send(res, error instanceof BankSourceError ? error.status : 502, { error: error instanceof BankSourceError ? error.message : 'source_unavailable' });
}
function authorized(req, token) {
  if (!token || token.length < 32) return false;
  const actual = Buffer.from(req.headers.authorization || ''), expected = Buffer.from('Bearer ' + token);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function createBankSourceHandler({ client = createBankSourceClient(), token = process.env.NEO_BANK_SOURCE_CONTROL_TOKEN } = {}) {
  return async (req, res) => {
    const url = new URL(req.url || '/', 'http://localhost');
    if (!url.pathname.startsWith('/internal/v1/data-source/')) return false;
    if (!authorized(req, token)) { send(res, 401, { error: 'authentication_required' }); return true; }
    if (req.headers.origin) { send(res, 403, { error: 'browser_origin_not_supported' }); return true; }
    if (url.search || req.headers['transfer-encoding'] || Number(req.headers['content-length'] || 0) > 0) { send(res, 400, { error: 'request_input_not_supported' }); return true; }
    try {
      if (req.method === 'GET' && url.pathname === '/internal/v1/data-source/status') send(res, 200, await client.status());
      else if (req.method === 'POST' && url.pathname === '/internal/v1/data-source/auth/check') send(res, 200, await client.verify());
      else if (req.method === 'GET' && url.pathname === '/internal/v1/data-source/report') {
        const report = await client.report(); send(res, report ? 200 : 404, report ? { report } : { error: 'report_not_available' });
      } else send(res, 404, { error: 'not_found' });
    } catch (error) { sendSourceError(res, error); }
    return true;
  };
}
