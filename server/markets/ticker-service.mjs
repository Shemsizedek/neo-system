const DEFAULT_TIMEOUT_MS = 8000;

export const DEFAULT_TICKER_CONFIG = Object.freeze({
  bitcoinPriceUrl: process.env.NEO_MARKETS_BITCOIN_PRICE_URL || 'https://mempool.space/api/v1/prices',
  xcpPriceUrl: process.env.NEO_MARKETS_XCP_PRICE_URL || 'https://api.coingecko.com/api/v3/simple/price?ids=counterparty&vs_currencies=usd,btc',
  fiatRatesUrl: process.env.NEO_MARKETS_FIAT_RATES_URL || 'https://api.frankfurter.app/latest?from=USD',
  counterpartyApiBase: process.env.NEO_MARKETS_COUNTERPARTY_API_BASE || 'https://api.counterparty.io:4000/v2',
  timeoutMs: Number(process.env.NEO_MARKETS_UPSTREAM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
});

const FX_PAIRS = Object.freeze(['BTC/USD', 'XCP/USD', 'NOMNI/USD', 'NOMNI/BTC']);
const DEX_PAIRS = Object.freeze(['NOMNI/XCP', 'XCP/BTC', 'NOMNI/BTC']);

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function positive(value) {
  const n = finite(value);
  return n !== null && n > 0 ? n : null;
}

async function fetchJson(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json', 'user-agent': 'neo-system/markets' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`upstream_http_${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

function quote({ pair, bid = null, ask = null, mid = null, last = null, source, timestamp, status = 'live', confidence = 'reference', meta = {} }) {
  const [base, quoteAsset] = pair.split('/');
  return { pair, base, quote: quoteAsset, bid, ask, mid, last, source, timestamp, status, confidence, ...meta };
}

function unavailable(pair, source, timestamp, reason) {
  return quote({ pair, source, timestamp, status: 'unavailable', confidence: 'unavailable', meta: { reason } });
}

function normalizedOrderQuantity(order, side) {
  const normalized = order?.[`${side}_quantity_normalized`] ?? order?.[`${side}_remaining_normalized`];
  const raw = order?.[`${side}_quantity`] ?? order?.[`${side}_remaining`];
  return positive(normalized ?? raw);
}

export function dexBookForPair(orders, pair) {
  const [base, quoteAsset] = pair.split('/');
  const asks = [];
  const bids = [];

  for (const order of Array.isArray(orders) ? orders : []) {
    if (String(order?.status || '').toLowerCase() !== 'open') continue;
    const giveAsset = String(order?.give_asset || '').toUpperCase();
    const getAsset = String(order?.get_asset || '').toUpperCase();
    const give = normalizedOrderQuantity(order, 'give');
    const get = normalizedOrderQuantity(order, 'get');
    if (!give || !get) continue;

    if (giveAsset === base && getAsset === quoteAsset) asks.push(get / give);
    if (giveAsset === quoteAsset && getAsset === base) bids.push(give / get);
  }

  const bid = bids.length ? Math.max(...bids) : null;
  const ask = asks.length ? Math.min(...asks) : null;
  const mid = bid !== null && ask !== null ? (bid + ask) / 2 : bid ?? ask;
  return { bid, ask, mid, bidCount: bids.length, askCount: asks.length };
}

function deriveNomniUsd(dexQuotes, xcpUsd, btcUsd) {
  const byPair = Object.fromEntries(dexQuotes.map((q) => [q.pair, q]));
  const nomniXcp = positive(byPair['NOMNI/XCP']?.mid);
  const nomniBtc = positive(byPair['NOMNI/BTC']?.mid);
  if (nomniXcp && positive(xcpUsd)) return { value: nomniXcp * xcpUsd, source: 'Counterparty DEX × CoinGecko XCP/USD', route: 'NOMNI/XCP→USD' };
  if (nomniBtc && positive(btcUsd)) return { value: nomniBtc * btcUsd, source: 'Counterparty DEX × mempool.space BTC/USD', route: 'NOMNI/BTC→USD' };
  return null;
}

export function createTickerService({ fetchImpl = globalThis.fetch, config = DEFAULT_TICKER_CONFIG, now = () => new Date().toISOString() } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');

  async function referenceInputs() {
    const timestamp = now();
    const [btcResult, xcpResult, fiatResult, ordersResult] = await Promise.allSettled([
      fetchJson(fetchImpl, config.bitcoinPriceUrl, config.timeoutMs),
      fetchJson(fetchImpl, config.xcpPriceUrl, config.timeoutMs),
      fetchJson(fetchImpl, config.fiatRatesUrl, config.timeoutMs),
      fetchJson(fetchImpl, `${config.counterpartyApiBase.replace(/\/$/, '')}/orders?status=open&limit=1000`, config.timeoutMs),
    ]);

    return {
      timestamp,
      btcUsd: btcResult.status === 'fulfilled' ? positive(btcResult.value?.USD ?? btcResult.value?.usd ?? btcResult.value?.price_usd) : null,
      xcpUsd: xcpResult.status === 'fulfilled' ? positive(xcpResult.value?.counterparty?.usd) : null,
      xcpBtc: xcpResult.status === 'fulfilled' ? positive(xcpResult.value?.counterparty?.btc) : null,
      fiatRates: fiatResult.status === 'fulfilled' ? fiatResult.value?.rates || {} : {},
      orders: ordersResult.status === 'fulfilled' ? ordersResult.value?.result || [] : [],
      errors: {
        btc: btcResult.status === 'rejected' ? btcResult.reason?.message || 'failed' : null,
        xcp: xcpResult.status === 'rejected' ? xcpResult.reason?.message || 'failed' : null,
        fiat: fiatResult.status === 'rejected' ? fiatResult.reason?.message || 'failed' : null,
        dex: ordersResult.status === 'rejected' ? ordersResult.reason?.message || 'failed' : null,
      },
    };
  }

  async function dex() {
    const input = await referenceInputs();
    const quotes = DEX_PAIRS.map((pair) => {
      const book = dexBookForPair(input.orders, pair);
      if (book.mid === null) return unavailable(pair, 'Counterparty Core API v2 orders', input.timestamp, input.errors.dex || 'no executable open orders');
      return quote({
        pair,
        bid: book.bid,
        ask: book.ask,
        mid: book.mid,
        last: null,
        source: 'Counterparty Core API v2 orders',
        timestamp: input.timestamp,
        confidence: book.bid !== null && book.ask !== null ? 'two-sided-book' : 'one-sided-book',
        meta: { bidCount: book.bidCount, askCount: book.askCount, executable: true },
      });
    });
    return { market: 'dex', code: 'NEODEX', generatedAt: input.timestamp, quotes, errors: input.errors };
  }

  async function fx() {
    const input = await referenceInputs();
    const dexQuotes = DEX_PAIRS.map((pair) => {
      const book = dexBookForPair(input.orders, pair);
      return { pair, ...book };
    });
    const nomniUsd = deriveNomniUsd(dexQuotes, input.xcpUsd, input.btcUsd);
    const nomniBtc = positive(dexQuotes.find((q) => q.pair === 'NOMNI/BTC')?.mid)
      ?? (positive(dexQuotes.find((q) => q.pair === 'NOMNI/XCP')?.mid) && input.xcpBtc ? dexQuotes.find((q) => q.pair === 'NOMNI/XCP').mid * input.xcpBtc : null);

    const quotes = [
      input.btcUsd ? quote({ pair: 'BTC/USD', last: input.btcUsd, mid: input.btcUsd, source: 'mempool.space', timestamp: input.timestamp, confidence: 'reference' }) : unavailable('BTC/USD', 'mempool.space', input.timestamp, input.errors.btc || 'price unavailable'),
      input.xcpUsd ? quote({ pair: 'XCP/USD', last: input.xcpUsd, mid: input.xcpUsd, source: 'CoinGecko', timestamp: input.timestamp, confidence: 'reference' }) : unavailable('XCP/USD', 'CoinGecko', input.timestamp, input.errors.xcp || 'price unavailable'),
      nomniUsd ? quote({ pair: 'NOMNI/USD', mid: nomniUsd.value, last: null, source: nomniUsd.source, timestamp: input.timestamp, confidence: 'derived-from-dex', meta: { route: nomniUsd.route } }) : unavailable('NOMNI/USD', 'NEOfx cross-rate', input.timestamp, 'no defensible NOMNI DEX cross-rate'),
      nomniBtc ? quote({ pair: 'NOMNI/BTC', mid: nomniBtc, last: null, source: 'Counterparty DEX cross-rate', timestamp: input.timestamp, confidence: 'derived-from-dex' }) : unavailable('NOMNI/BTC', 'Counterparty DEX', input.timestamp, 'no defensible NOMNI/BTC cross-rate'),
    ];

    return { market: 'fx', code: 'NEOFX', generatedAt: input.timestamp, quotes, fiatRates: input.fiatRates, errors: input.errors };
  }

  async function tickers({ market = 'fx' } = {}) {
    const normalized = String(market).toLowerCase();
    if (normalized === 'fx') return fx();
    if (normalized === 'dex') return dex();
    if (normalized === 'all') {
      const [fxResult, dexResult] = await Promise.all([fx(), dex()]);
      return { market: 'all', code: 'NEOMARKETS', generatedAt: now(), quotes: [...fxResult.quotes, ...dexResult.quotes], fx: fxResult, dex: dexResult };
    }
    throw new RangeError('market must be fx, dex, or all');
  }

  return { fx, dex, tickers };
}

export { FX_PAIRS, DEX_PAIRS };
