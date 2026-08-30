import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MINING_SOURCE_TYPES,
  getMiningSource,
  registerMiningSource,
  classifyProductionEvent,
} from './sourceRegistry.mjs';

test('CryptoTab is classified as converted-to-BTC, not native BTC hashing', () => {
  const source = getMiningSource('cryptotab');
  assert.equal(source.type, MINING_SOURCE_TYPES.CONVERTED_TO_BTC);
  assert.equal(source.underlyingAsset, 'XMR');
  assert.equal(source.payoutAsset, 'BTC');
  assert.equal(source.directBitcoinHashing, false);
  assert.equal(source.authoritativeForHashrate, false);
});

test('non-authoritative sources cannot inject reported hashrate', () => {
  const event = classifyProductionEvent('cryptotab', {
    reportedHashrate: 999999,
    grossPayoutSats: 1234,
  });
  assert.equal(event.reportedHashrate, null);
  assert.equal(event.grossPayoutSats, 1234);
});

test('native miner sources may carry authoritative hashrate', () => {
  registerMiningSource({
    id: 'neo-native-test',
    name: 'NEO Native Miner Test',
    type: MINING_SOURCE_TYPES.NATIVE_BTC_HASHING,
    payoutAsset: 'BTC',
    directBitcoinHashing: true,
    authoritativeForHashrate: true,
  });

  const event = classifyProductionEvent('neo-native-test', { reportedHashrate: 120 });
  assert.equal(event.reportedHashrate, 120);
  assert.equal(event.directBitcoinHashing, true);
});
