const DEFAULT_TIMEOUT_MS = 8000;

export const DEFAULT_MARKET_CONFIG = Object.freeze({
  bitcoinPriceUrl: process.env.NEO_PRIME_BITCOIN_PRICE_URL || 'https://mempool.space/api/v1/prices',
  bitcoinHeightUrl: process.env.NEO_PRIME_BITCOIN_HEIGHT_URL || 'https://mempool.space/api/blocks/tip/height',
  counterpartyApiBase: process.env.NEO_PRIME_COUNTERPARTY_API_BASE || 'https://api.counterparty.io:4000/v2',
  timeoutMs: Number(process.env.NEO_PRIME_UPSTREAM_TIMEOUT_MS || DEFAULT_TIMEOUT_MS),
});

function asNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

async function fetchJson(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      headers: { accept: 'application/json', 'user-agent': 'neo-system/neo-prime' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`upstream_http_${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`upstream_http_${response.status}`);
    return response.text();
  } finally {
    clearTimeout(timer);
  }
}

function normalizeAsset(raw, symbol) {
  const source = raw?.result ?? raw;
  const data = source?.data ?? source;
  return {
    symbol,
    asset: data?.asset ?? data?.asset_name ?? symbol,
    supply: asNumber(data?.supply ?? data?.quantity ?? data?.issued),
    divisible: typeof data?.divisible === 'boolean' ? data.divisible : null,
    locked: typeof data?.locked === 'boolean' ? data.locked : null,
    issuer: data?.issuer ?? null,
    description: data?.description ?? null,
    raw: data ?? null,
  };
}

export function createNeoPrimeMarketData({ fetchImpl = globalThis.fetch, config = DEFAULT_MARKET_CONFIG, now = () => new Date().toISOString() } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetch implementation is required');

  async function bitcoin() {
    const [priceResult, heightResult] = await Promise.allSettled([
      fetchJson(fetchImpl, config.bitcoinPriceUrl, config.timeoutMs),
      fetchText(fetchImpl, config.bitcoinHeightUrl, config.timeoutMs),
    ]);
    const prices = priceResult.status === 'fulfilled' ? priceResult.value : null;
    const height = heightResult.status === 'fulfilled' ? asNumber(heightResult.value) : null;
    return {
      symbol: 'BTC',
      priceUsd: asNumber(prices?.USD ?? prices?.usd ?? prices?.price_usd),
      blockHeight: height,
      status: prices || height !== null ? 'ok' : 'degraded',
      errors: [
        priceResult.status === 'rejected' ? `price:${priceResult.reason?.message || 'failed'}` : null,
        heightResult.status === 'rejected' ? `height:${heightResult.reason?.message || 'failed'}` : null,
      ].filter(Boolean),
    };
  }

  async function asset(symbol) {
    const safeSymbol = String(symbol || '').toUpperCase().replace(/[^A-Z0-9._-]/g, '');
    if (!safeSymbol) throw new TypeError('asset symbol is required');
    const url = `${config.counterpartyApiBase.replace(/\/$/, '')}/assets/${encodeURIComponent(safeSymbol)}`;
    try {
      const raw = await fetchJson(fetchImpl, url, config.timeoutMs);
      return { ...normalizeAsset(raw, safeSymbol), status: 'ok', errors: [] };
    } catch (error) {
      return { ...normalizeAsset(null, safeSymbol), status: 'degraded', errors: [error?.message || 'failed'] };
    }
  }

  async function snapshot({ assets = ['XCP', 'NOMNI'] } = {}) {
    const generatedAt = now();
    const [btc, ...counterpartyAssets] = await Promise.all([
      bitcoin(),
      ...assets.map((symbol) => asset(symbol)),
    ]);
    const degraded = [btc, ...counterpartyAssets].some((entry) => entry.status !== 'ok');
    return {
      service: 'neo-prime-market-data',
      apiVersion: 'v1',
      generatedAt,
      status: degraded ? 'degraded' : 'ok',
      bitcoin: btc,
      counterparty: Object.fromEntries(counterpartyAssets.map((entry) => [entry.symbol, entry])),
    };
  }

  return { bitcoin, asset, snapshot };
}
