import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createModernTreasuryHttpHandler, sendTreasuryJson } from './modern-treasury-http.mjs';

// This host exposes only health and the restricted Modern Treasury read routes.
// It does not import or initialize merchant ledgers, payouts or settlements.
export function createModernTreasuryStagingServer(options = {}) {
  const handle = createModernTreasuryHttpHandler(options);
  const revision = options.revision || process.env.NEO_TREASURY_REVISION || null;
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://neo.local');
      if (req.method === 'GET' && url.pathname === '/health') {
        sendTreasuryJson(res, 200, {
          ok: true, service: 'neo-modern-treasury-staging', environment: 'sandbox',
          read_only: true, payment_execution_enabled: false, revision
        });
        return;
      }
      if (await handle(req, res, url)) return;
      sendTreasuryJson(res, 404, { error: 'not_found' });
    } catch {
      sendTreasuryJson(res, 400, { error: 'invalid_request' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = createModernTreasuryStagingServer();
  server.listen(Number(process.env.PORT || 10000), '0.0.0.0');
  process.once('SIGTERM', () => server.close());
}
