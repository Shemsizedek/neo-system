import test from 'node:test'
import assert from 'node:assert/strict'
import { createAgentWalletRegister, isLegacyMainnetAddress } from './agent-wallet-register.mjs'
import { createMissionEngine } from './mission-engine.mjs'
import { createWorkerFleet } from './worker-fleet.mjs'

// Public historical address used strictly as a checksum fixture, never a NEO destination.
const address = '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'
const input = { principalId: 'neo-general-worker', ownerId: 'operator-fixture', address, protocol: 'counterparty' }

test('validates checksum and rejects wrong network, unsupported formats and malformed input', () => {
  assert.equal(isLegacyMainnetAddress(address), true)
  for (const invalid of [null, '', address + ' ', address.slice(0, -1) + 'b', 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn', 'bc1qexample', '0x123', '1'.repeat(26)]) assert.equal(isLegacyMainnetAddress(invalid), false)
})

test('proposals remain pending; unknown principals, duplicates and extra fields fail closed', () => {
  const register = createAgentWalletRegister()
  const result = register.propose(input)
  assert.equal(result.status, 'pending-control-verification')
  assert.equal(result.signingEnabled, false)
  result.status = 'active'
  assert.equal(register.snapshot().bindings[0].status, 'pending-control-verification')
  assert.throws(() => register.propose(input), /already assigned/)
  assert.throws(() => register.propose({ ...input, principalId: 'neo-github-worker' }), /already assigned/)
  assert.throws(() => register.propose({ ...input, principalId: 'unknown' }), /Known principal/)
  assert.throws(() => register.propose({ ...input, protocol: 'evm' }), /Supported/)
  assert.throws(() => register.propose({ ...input, privateKey: 'synthetic-forbidden-field' }), /Only public/)
  assert.throws(() => register.propose({ ...input, signingEnabled: true }), /Only public/)
})

test('real worker execution produces one detached internal reference without copying task data', async () => {
  const engine = createMissionEngine()
  const register = createAgentWalletRegister({ engine })
  register.propose(input)
  engine.queue({ id: 'work-1', objective: 'synthetic availability check', actions: [{ connector: 'synthetic' }] })
  assert.throws(() => register.recordWork({ principalId: input.principalId, missionId: 'work-1' }), /completion evidence/)
  const fleet = createWorkerFleet({ engine, profiles: [{ id: input.principalId, role: 'general', capabilities: [], concurrency: 1 }], adapters: { synthetic: async () => ({ privateResult: 'not-for-receipt' }) } })
  assert.equal((await fleet.tick())[0].completed, true)
  const receipt = register.recordWork({ principalId: input.principalId, missionId: 'work-1' })
  assert.equal(receipt.onChain, false)
  assert.equal(receipt.settlementStatus, 'not-requested')
  assert.match(receipt.digest, /^[a-f0-9]{64}$/)
  assert.equal(JSON.stringify(receipt).includes('not-for-receipt'), false)
  assert.deepEqual(register.recordWork({ principalId: input.principalId, missionId: 'work-1' }), receipt)
  receipt.address = 'changed'
  assert.equal(register.snapshot().receipts[0].address, address)
})

test('another worker or missing engine cannot claim completed work', () => {
  const engine = createMissionEngine()
  const register = createAgentWalletRegister({ engine })
  register.propose(input)
  engine.queue({ id: 'work-2', objective: 'synthetic' })
  engine.prepare('work-2')
  engine.transition('work-2', 'completed', { workerId: 'neo-github-worker' })
  assert.throws(() => register.recordWork({ principalId: input.principalId, missionId: 'work-2' }), /completion evidence/)
  const offline = createAgentWalletRegister()
  offline.propose(input)
  assert.throws(() => offline.recordWork({ principalId: input.principalId, missionId: 'work-2' }), /completion evidence/)
})

test('existing wallet providers use the same enrollment path with explicit ledger labels', () => {
  for (const provider of ['freewallet.io', 'xcp-wallet', 'counterpay', 'other-counterparty-wallet', 'existing-wallet']) {
    const register = createAgentWalletRegister()
    const binding = register.propose({ ...input, provider, ledger: 'counterparty-2.0' })
    assert.equal(binding.provider, provider)
    assert.equal(binding.ledger, 'counterparty-2.0')
    assert.equal(binding.signingEnabled, false)
  }
  assert.equal(createAgentWalletRegister().propose(input).ledger, 'unverified')
  assert.equal(createAgentWalletRegister().propose({ ...input, protocol: 'bitcoin' }).ledger, 'bitcoin')
  assert.equal(createAgentWalletRegister().propose({ ...input, ledger: 'counterparty-classic' }).ledger, 'counterparty-classic')
  for (const invalid of [{ provider: 'xcp.io' }, { ledger: 'bitcoin' }, { protocol: 'bitcoin', ledger: 'counterparty-2.0' }]) {
    assert.throws(() => createAgentWalletRegister().propose({ ...input, ...invalid }))
  }
})
