import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const COUNTERPARTY_API_BASE = (process.env.COUNTERPARTY_API_BASE || 'https://api.counterparty.io:4000').replace(/\/$/, '');
const ALLOWED_ORIGIN = process.env.NEO_EXCHANGE_ALLOWED_ORIGIN || '*';
const DEFAULT_ADDRESSES = [
  '18FyntJG9hdXYvanm67mGgbyo1P7adckvg',
  '1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'
];

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': ALLOWED_ORIGIN,
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  res.end(JSON.stringify(body));
}

async function counterparty(path) {
  const response = await fetch(`${COUNTERPARTY_API_BASE}${path}`, {
    headers: { accept: 'application/json', 'user-agent': 'neo-exchange/0.1' }
  });
  if (!response.ok) throw new Error(`Counterparty upstream ${response.status}`);
  return response.json();
}

function normalizeRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.result?.data)) return payload.result.data;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function addressBalances(address) {
  const payload = await counterparty(`/v2/addresses/${encodeURIComponent(address)}/balances?verbose=true`);
  return normalizeRows(payload).map((row) => ({
    address,
    asset: row.asset || row.asset_info?.asset || 'UNKNOWN',
    quantity: row.quantity ?? row.normalized_quantity ?? row.balance ?? null,
    asset_info: row.asset_info || null
  }));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  try {
    if (req.method === 'GET' && url.pathname === '/api/neo-exchange/health') {
      return send(res, 200, {
        ok: true,
        service: 'neo-exchange-api',
        counterparty_api_base: COUNTERPARTY_API_BASE,
        execution: 'review-gated'
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/neo-exchange/assets') {
      const requested = (url.searchParams.get('addresses') || '')
        .split(',').map(v => v.trim()).filter(Boolean);
      const addresses = requested.length ? requested.slice(0, 5) : DEFAULT_ADDRESSES;
      const settled = await Promise.allSettled(addresses.map(addressBalances));
      const assets = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
      return send(res, 200, {
        status: settled.every(v => v.status === 'fulfilled') ? 'LIVE' : 'DEGRADED',
        network: 'bitcoin-mainnet',
        protocol: 'counterparty',
        addresses,
        assets
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/neo-exchange/markets') {
      let payload;
      try {
        payload = await counterparty('/v2/orders?status=open&verbose=true&limit=100');
      } catch {
        payload = { result: [] };
      }
      return send(res, 200, {
        status: 'LIVE',
        source: 'counterparty-core',
        orders: normalizeRows(payload)
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/neo-exchange/orders/compose') {
      return send(res, 501, {
        ok: false,
        code: 'SIGNING_GATE_NOT_ENABLED',
        message: 'Order composition and broadcast are intentionally disabled in the ORIGIN GitHub gate until secure user-controlled signing, validation, fee review, and broadcast adapters are separately audited.'
      });
    }

    return send(res, 404, { error: 'Not found' });
  } catch (error) {
    return send(res, 502, {
      error: 'Upstream data request failed',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

server.listen(PORT, () => {
  console.log(`NEO Exchange API listening on :${PORT}`);
});
