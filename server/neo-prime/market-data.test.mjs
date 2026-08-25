import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeoPrimeMarketData } from './market-data.mjs';

const config = {
  bitcoinPriceUrl: 'https://example.test/btc-price',
  bitcoinHeightUrl: 'https://example.test/btc-height',
  counterpartyApiBase: 'https://example.test/counterparty',
  timeoutMs: 100,
};

function response(body, { status = 200, json = true } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return json ? body : JSON.parse(body); },
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
  };
}

test('NEO Prime produces normalized BTC/XCP/NOMNI snapshot', async () => {
  const fetchImpl = async (url) => {
    if (url === config.bitcoinPriceUrl) return response({ USD: 112000 });
    if (url === config.bitcoinHeightUrl) return response('910144', { json: false });
    if (url.endsWith('/assets/XCP')) return response({ result: { asset: 'XCP', supply: 2600000, divisible: true, locked: false } });
    if (url.endsWith('/assets/NOMNI')) return response({ result: { asset: 'NOMNI', supply: 900000000, divisible: false, locked: true } });
    return response({}, { status: 404 });
  };
  const market = createNeoPrimeMarketData({ fetchImpl, config, now: () => '2026-08-25T21:30:00.000Z' });
  const snapshot = await market.snapshot();
  assert.equal(snapshot.status, 'ok');
  assert.equal(snapshot.bitcoin.priceUsd, 112000);
  assert.equal(snapshot.bitcoin.blockHeight, 910144);
  assert.equal(snapshot.counterparty.XCP.divisible, true);
  assert.equal(snapshot.counterparty.NOMNI.supply, 900000000);
  assert.equal(snapshot.counterparty.NOMNI.locked, true);
});

test('NEO Prime degrades one upstream without failing the whole snapshot', async () => {
  const fetchImpl = async (url) => {
    if (url === config.bitcoinPriceUrl) throw new Error('price_down');
    if (url === config.bitcoinHeightUrl) return response('910145', { json: false });
    if (url.endsWith('/assets/XCP')) return response({}, { status: 503 });
    if (url.endsWith('/assets/NOMNI')) return response({ result: { asset: 'NOMNI', supply: '900000000' } });
    return response({}, { status: 404 });
  };
  const market = createNeoPrimeMarketData({ fetchImpl, config });
  const snapshot = await market.snapshot();
  assert.equal(snapshot.status, 'degraded');
  assert.equal(snapshot.bitcoin.blockHeight, 910145);
  assert.equal(snapshot.bitcoin.priceUsd, null);
  assert.equal(snapshot.counterparty.XCP.status, 'degraded');
  assert.equal(snapshot.counterparty.NOMNI.status, 'ok');
});
