import test from 'node:test'
import assert from 'node:assert/strict'
import { WALLET_FEE_POLICY, quoteBitcoinTransferFee } from '../../src/neopay/serviceFee.ts'

const quote = (overrides = {}) => quoteBitcoinTransferFee({
  recipientSats: 100_000_000n, networkFeeSats: 1_000n,
  capSats: 100_000n, treasuryDustSats: 546n, ...overrides,
})

test('0.09% levy preserves recipient amount and separates network cost', () => {
  const q = quote()
  assert.equal(q.serviceFeeSats, 90_000n)
  assert.equal(q.recipientSats, 100_000_000n)
  assert.equal(q.networkFeeSats, 1_000n)
  assert.equal(q.totalDebitSats, 100_091_000n)
  assert.equal(q.capped, false)
  assert.equal(quote({ networkFeeSats: 2_000n }).serviceFeeSats, q.serviceFeeSats)
})
test('explicit cap limits large transfers', () => {
  const q = quote({ recipientSats: 1_000_000_000n, capSats: 50_000n })
  assert.equal(q.serviceFeeSats, 50_000n)
  assert.equal(q.capped, true)
})
test('dust charges are waived, never paid to miners or rounded upward', () => {
  const q = quote({ recipientSats: 100_000n })
  assert.equal(q.serviceFeeSats, 0n)
  assert.equal(q.networkFeeSats, 1_000n)
  assert.equal(q.totalDebitSats, 101_000n)
  assert.equal(q.dustWaived, true)
  assert.equal(quote({ recipientSats: 606_667n }).serviceFeeSats, 546n)
})
test('fractional satoshis round down and quotes are immutable', () => {
  const q = quote({ recipientSats: 1_000_001n })
  assert.equal(q.serviceFeeSats, 900n)
  assert.ok(Object.isFrozen(q))
})
test('invalid inputs and missing cap fail rather than pricing silently', () => {
  for (const overrides of [
    { recipientSats: 0n }, { recipientSats: -1n }, { recipientSats: 1_000_000 },
    { networkFeeSats: -1n }, { capSats: undefined }, { capSats: 0n },
    { treasuryDustSats: 0n }, { recipientSats: 2_100_000_000_000_000n },
  ]) assert.throws(() => quote(overrides))
})
test('collection stays disabled pending configuration and signer integration', () => {
  assert.equal(WALLET_FEE_POLICY.collectionEnabled, false)
  assert.equal(WALLET_FEE_POLICY.capSats, null)
  assert.equal(WALLET_FEE_POLICY.treasuryAddress, null)
  assert.ok(Object.isFrozen(WALLET_FEE_POLICY))
})
