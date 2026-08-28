import test from 'node:test';
import assert from 'node:assert/strict';
import { createTickerService, dexBookForPair } from './ticker-service.mjs';

test('dexBookForPair computes best bid and ask', () => {
  const orders = [
    { status: 'open', give_asset: 'NOMNI', get_asset: 'XCP', give_quantity_normalized: '10', get_quantity_normalized: '20' },
    { status: 'open', give_asset: 'NOMNI', get_asset: 'XCP', give_quantity_normalized: '10', get_quantity_normalized: '18' },
    { status: 'open', give_asset: 'XCP', get_asset: 'NOMNI', give_quantity_normalized: '15', get_quantity_normalized: '10' },
  ];
  const book = dexBookForPair(orders, 'NOMNI/XCP');
  assert.equal(book.ask, 1.8);
  assert.equal(book.bid, 1.5);
  assert.equal(book.mid, 1.65);
  assert.equal(book.askCount, 2);
  assert.equal(book.bidCount, 1);
});

test('ticker service derives NOMNI/USD only from live DEX cross-rate', async () => {
  const responses = new Map([
    ['https://btc.test', { USD: 100000 }],
    ['https://xcp.test', { counterparty: { usd: 10, btc: 0.0001 } }],
    ['https://fx.test', { rates: { EUR: 0.9 } }],
    ['https://cp.test/orders?status=open&limit=1000', { result: [
      { status: 'open', give_asset: 'NOMNI', get_asset: 'XCP', give_quantity_normalized: '10', get_quantity_normalized: '20' },
      { status: 'open', give_asset: 'XCP', get_asset: 'NOMNI', give_quantity_normalized: '15', get_quantity_normalized: '10' },
    ] }],
  ]);
  const fetchImpl = async (url) => ({ ok: true, json: async () => responses.get(String(url)) });
  const service = createTickerService({
    fetchImpl,
    now: () => '2026-08-28T15:00:00.000Z',
    config: { bitcoinPriceUrl: 'https://btc.test', xcpPriceUrl: 'https://xcp.test', fiatRatesUrl: 'https://fx.test', counterpartyApiBase: 'https://cp.test', timeoutMs: 1000 },
  });
  const result = await service.fx();
  const nomniUsd = result.quotes.find((q) => q.pair === 'NOMNI/USD');
  assert.equal(nomniUsd.mid, 16.5);
  assert.equal(nomniUsd.confidence, 'derived-from-dex');
});

test('ticker service marks NOMNI unavailable without executable market evidence', async () => {
  const responses = new Map([
    ['https://btc.test', { USD: 100000 }],
    ['https://xcp.test', { counterparty: { usd: 10, btc: 0.0001 } }],
    ['https://fx.test', { rates: { EUR: 0.9 } }],
    ['https://cp.test/orders?status=open&limit=1000', { result: [] }],
  ]);
  const fetchImpl = async (url) => ({ ok: true, json: async () => responses.get(String(url)) });
  const service = createTickerService({
    fetchImpl,
    config: { bitcoinPriceUrl: 'https://btc.test', xcpPriceUrl: 'https://xcp.test', fiatRatesUrl: 'https://fx.test', counterpartyApiBase: 'https://cp.test', timeoutMs: 1000 },
  });
  const result = await service.fx();
  assert.equal(result.quotes.find((q) => q.pair === 'NOMNI/USD').status, 'unavailable');
  assert.equal(result.quotes.find((q) => q.pair === 'NOMNI/BTC').status, 'unavailable');
});
