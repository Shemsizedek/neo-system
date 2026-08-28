import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const COUNTERPARTY_API_BASE = (process.env.COUNTERPARTY_API_BASE || 'https://api.counterparty.io:4000').replace(/\/$/, '');
const ALLOWED_ORIGIN = process.env.NEO_EXCHANGE_ALLOWED_ORIGIN || '*';
const DEFAULT_ADDRESSES = [
  '18FyntJG9hdXYvanm67mGgbyo1P7adckvg',
  '1Ky2wRYYrJzqdQJH64F7TR98fqLxJs7LK8'
];
const PRIORITY_ASSETS = ['BTC', 'XCP', 'NOMNI', 'NEOCASH'];

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
    headers: { accept: 'application/json', 'user-agent': 'neo-exchange/0.2' }
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

function asNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function quantity(row, side) {
  return asNumber(
    row?.[`${side}_quantity_normalized`] ??
    row?.[`${side}_remaining_normalized`] ??
    row?.[`${side}_quantity`] ??
    row?.[`${side}_remaining`]
  );
}

function canonicalPair(a, b) {
  if (!a || !b || a === b) return null;
  const ai = PRIORITY_ASSETS.indexOf(a);
  const bi = PRIORITY_ASSETS.indexOf(b);
  if (ai >= 0 || bi >= 0) {
    if (ai === -1) return [a, b];
    if (bi === -1) return [b, a];
    return ai < bi ? [b, a] : [a, b];
  }
  return [a, b].sort();
}

function normalizeOrder(row) {
  const giveAsset = row.give_asset || row.give_asset_info?.asset;
  const getAsset = row.get_asset || row.get_asset_info?.asset;
  const give = quantity(row, 'give');
  const get = quantity(row, 'get');
  return {
    tx_hash: row.tx_hash || null,
    source: row.source || null,
    status: row.status || null,
    give_asset: giveAsset || null,
    get_asset: getAsset || null,
    give_quantity: give,
    get_quantity: get,
    block_index: row.block_index ?? null,
    expire_index: row.expire_index ?? null
  };
}

function orderForPair(order, base, quote) {
  if (order.give_asset === base && order.get_asset === quote && order.give_quantity > 0 && order.get_quantity > 0) {
    return {
      ...order,
      side: 'ASK',
      price: order.get_quantity / order.give_quantity,
      amount: order.give_quantity,
      total: order.get_quantity
    };
  }
  if (order.give_asset === quote && order.get_asset === base && order.give_quantity > 0 && order.get_quantity > 0) {
    return {
      ...order,
      side: 'BID',
      price: order.give_quantity / order.get_quantity,
      amount: order.get_quantity,
      total: order.give_quantity
    };
  }
  return null;
}

function summarizeBook(base, quote, orders) {
  const normalized = orders.map(normalizeOrder).map(o => orderForPair(o, base, quote)).filter(Boolean);
  const bids = normalized.filter(o => o.side === 'BID').sort((a, b) => b.price - a.price);
  const asks = normalized.filter(o => o.side === 'ASK').sort((a, b) => a.price - b.price);
  const bestBid = bids[0]?.price ?? null;
  const bestAsk = asks[0]?.price ?? null;
  const mid = bestBid != null && bestAsk != null ? (bestBid + bestAsk) / 2 : bestBid ?? bestAsk;
  const spread = bestBid != null && bestAsk != null ? bestAsk - bestBid : null;
  return { base, quote, pair: `${base}/${quote}`, best_bid: bestBid, best_ask: bestAsk, mid, spread, bids, asks };
}

async function openOrders() {
  const payload = await counterparty('/v2/orders?status=open&verbose=true&limit=500');
  return normalizeRows(payload);
}

async function addressBalances(address) {
  const payload = await counterparty(`/v2/addresses/${encodeURIComponent(address)}/balances?verbose=true`);
  return normalizeRows(payload).map((row) => ({
    address,
    asset: row.asset || row.asset_info?.asset || 'UNKNOWN',
    quantity: row.quantity_normalized ?? row.normalized_quantity ?? row.quantity ?? row.balance ?? null,
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
        version: '0.2-live-markets',
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
      const orders = await openOrders();
      const pairs = new Map();
      for (const raw of orders) {
        const order = normalizeOrder(raw);
        const pair = canonicalPair(order.give_asset, order.get_asset);
        if (!pair) continue;
        const key = pair.join('/');
        if (!pairs.has(key)) pairs.set(key, pair);
      }
      const markets = [...pairs.values()]
        .map(([base, quote]) => summarizeBook(base, quote, orders))
        .filter(m => m.bids.length || m.asks.length)
        .sort((a, b) => (b.bids.length + b.asks.length) - (a.bids.length + a.asks.length))
        .slice(0, 100)
        .map(({ bids, asks, ...m }) => ({ ...m, bid_depth: bids.length, ask_depth: asks.length }));
      return send(res, 200, {
        status: 'LIVE',
        source: 'counterparty-core-v2',
        as_of: new Date().toISOString(),
        markets
      });
    }

    if (req.method === 'GET' && url.pathname === '/api/neo-exchange/orderbook') {
      const base = (url.searchParams.get('base') || '').trim().toUpperCase();
      const quote = (url.searchParams.get('quote') || '').trim().toUpperCase();
      if (!base || !quote || base === quote) return send(res, 400, { error: 'base and quote are required and must differ' });
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 25), 1), 100);
      const orders = await openOrders();
      const book = summarizeBook(base, quote, orders);
      return send(res, 200, {
        status: 'LIVE',
        source: 'counterparty-core-v2',
        as_of: new Date().toISOString(),
        ...book,
        bids: book.bids.slice(0, limit),
        asks: book.asks.slice(0, limit)
      });
    }

    if (req.method === 'POST' && url.pathname === '/api/neo-exchange/orders/compose') {
      return send(res, 501, {
        ok: false,
        code: 'SIGNING_GATE_NOT_ENABLED',
        message: 'Order composition and broadcast remain intentionally disabled until secure user-controlled signing, validation, fee review, broadcast, recovery, and audit gates are separately approved.'
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
