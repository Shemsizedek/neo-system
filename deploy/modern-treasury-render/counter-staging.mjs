import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { createStore } from '../../server/neo-counter-backend/store.mjs';
import { createHandler } from '../../server/neo-counter-backend/server.mjs';
import { createModernTreasuryHttpHandler, sendTreasuryJson } from '../../server/neo-merchant-treasury/modern-treasury-http.mjs';

// Compose the sandbox connector with the existing Counter staging API.
// Counter requests keep their original handler, credentials, DB and paths.
export function createCounterTreasuryStagingServer({
  counterHandler,
  treasuryHandler = createModernTreasuryHttpHandler(),
  revision = process.env.NEO_TREASURY_REVISION || null
} = {}) {
  if (typeof counterHandler !== 'function') throw new TypeError('counter_handler_required');
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', 'http://neo.local');
      if (req.method === 'GET' && url.pathname === '/health/modern-treasury') {
        sendTreasuryJson(res, 200, {
          ok: true, service: 'neo-counter-modern-treasury-staging', environment: 'sandbox',
          read_only: true, payment_execution_enabled: false, revision
        });
        return;
      }
      if (await treasuryHandler(req, res, url)) return;
      await counterHandler(req, res);
    } catch {
      sendTreasuryJson(res, 500, { error: 'staging_request_failed' });
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = createStore(process.env.NEO_COUNTER_DB_PATH || 'data/neo-counter.sqlite');
  const server = createCounterTreasuryStagingServer({ counterHandler: createHandler(store) });
  server.listen(Number(process.env.NEO_COUNTER_PORT || process.env.PORT || 10000), '0.0.0.0');
  process.once('SIGTERM', () => server.close(() => store.db.close()));
}
