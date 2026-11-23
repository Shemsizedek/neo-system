import { timingSafeEqual } from 'node:crypto';
import { createModernTreasuryConnector, ModernTreasuryError } from './modern-treasury.mjs';

export const MODERN_TREASURY_PREFIX = '/v1/integrations/modern-treasury';

export function sendTreasuryJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff'
  });
  res.end(JSON.stringify(body));
}

// Shared by the existing merchant service and the isolated sandbox host.
export function createModernTreasuryHttpHandler({
  operatorToken = process.env.NEO_MERCHANT_TREASURY_OPERATOR_TOKEN || '',
  connector = createModernTreasuryConnector()
} = {}) {
  const expected = Buffer.from(`Bearer ${operatorToken}`);
  return async (req, res, url = new URL(req.url || '/', 'http://neo.local')) => {
    const prefix = MODERN_TREASURY_PREFIX;
    if (url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return false;
    const actual = Buffer.from(String(req.headers.authorization || ''));
    if (!operatorToken || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      sendTreasuryJson(res, 401, { error: 'operator_auth_required' });
      return true;
    }
    try {
      if (req.method !== 'GET') {
        res.setHeader('allow', 'GET');
        sendTreasuryJson(res, 405, { error: 'modern_treasury_read_only', read_only: true });
        return true;
      }
      const allowed = url.pathname === `${prefix}/internal-accounts` ? ['per_page', 'after_cursor', 'currency'] : [];
      if ([...url.searchParams.keys()].some(key => !allowed.includes(key) || url.searchParams.getAll(key).length !== 1)) {
        throw new ModernTreasuryError('modern_treasury_invalid_query', 400);
      }
      if (url.pathname === `${prefix}/status`) sendTreasuryJson(res, 200, connector.status());
      else if (url.pathname === `${prefix}/check`) sendTreasuryJson(res, 200, await connector.verifyConnection());
      else if (url.pathname === `${prefix}/internal-accounts`) sendTreasuryJson(res, 200, await connector.listInternalAccounts({
        perPage: url.searchParams.has('per_page') ? Number(url.searchParams.get('per_page')) : 25,
        afterCursor: url.searchParams.get('after_cursor') ?? undefined,
        currency: url.searchParams.get('currency') ?? undefined
      }));
      else sendTreasuryJson(res, 404, { error: 'not_found', read_only: true });
    } catch (error) {
      sendTreasuryJson(res, error instanceof ModernTreasuryError ? error.status : 502, {
        error: error instanceof ModernTreasuryError ? error.code : 'modern_treasury_request_failed',
        read_only: true, payment_execution_enabled: false
      });
    }
    return true;
  };
}
