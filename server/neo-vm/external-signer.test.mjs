import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createExternalSigningWorkflow } from './external-signer.mjs'
import { inspectFinalTransaction, verifyFinalTransaction } from './final-transaction.mjs'
import { createSqliteApprovalStore } from './approval-store.mjs'
import { compileSignatureRefund } from '../../core/neo-nvm/signature-refund.mjs'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'
import { issueNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'
import { fixtureKey, fixturePsbt, fixtureIntent, fixtureApproval, signedFixtureSpend, fixtureTransaction } from '../../scripts/test-support/neo-vm-fixtures.mjs'
import { fixtureSignerResponse } from '../../scripts/test-support/neo-vm-signer-fixtures.mjs'

const keys = generateKeyPairSync('ed25519'), device = generateKeyPairSync('ed25519'), other = generateKeyPairSync('ed25519')
const preimageHex = '01'.repeat(32)
const program = { schemaVersion: 1, family: 'bitcoin', network: 'regtest', kind: 'sha256-signature-refund-v1',
  digestHex: sha256Hex(Buffer.from(preimageHex, 'hex')), redeemPublicKeyHex: fixtureKey(1).publicKeyHex, refundPublicKeyHex: fixtureKey(2).publicKeyHex, refundHeight: 128 }
const plan = compileSignatureRefund(program), outpoint = { txid: 'ab'.repeat(32), vout: 0 }
const code = expected => error => error.code === expected
function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'neo-vm-signer-test-'))
  const state = { clock: 1_100, calls: [], signCalls: 0, reads: 0, serial: 0, active: true, tip: 'aa'.repeat(32) }
  const store = createSqliteApprovalStore({ filename: join(directory, 'approval.sqlite'), now: () => state.clock })
  t.after(() => { store.close(); rmSync(directory, { recursive: true, force: true }) })
  const subject = 'google:fixture-operator', secret = 'TEST_ONLY_SESSION_SECRET_'.repeat(3)
  const options = {
    approvalStore: store, now: () => state.clock, jwtSecret: secret, jwtIssuer: 'neo-pass',
    registry: { async getNEOpassCredential() { state.reads++; await state.onRegistry?.(state.reads); return { subject, provider: 'google', providerSubject: 'fixture-operator', status: state.active ? 'active' : 'suspended' } } },
    bindings: [{ subject, approverId: 'fixture-operator', publicKey: keys.publicKey }],
    signer: { signerId: 'fixture-device', publicKey: device.publicKey, bitcoinPublicKeys: [plan.redeemPublicKeyHex, plan.refundPublicKeyHex], approverIds: ['fixture-operator'] },
    reviewRpc: async (method, params) => {
      state.calls.push({ phase: 'review', method }); await state.onRpc?.('review', method)
      return method === 'getblockchaininfo' ? { chain: 'regtest', blocks: 1_000 } : method === 'gettxout' ? { value: 50, scriptPubKey: { hex: plan.scriptPubKeyHex } } : {
        psbt_version: 0, tx: { version: 2, locktime: 0, weight: 328, vin: [{ ...outpoint, sequence: 0xfffffffd, scriptSig: { hex: '' } }], vout: [{ value: 49.9999, scriptPubKey: { hex: '0014' + '11'.repeat(20) } }] },
        inputs: [{ witness_utxo: { amount: 50, scriptPubKey: { hex: plan.scriptPubKeyHex } }, witness_script: { hex: plan.witnessScriptHex }, sighash: 'ALL' }], outputs: [{}],
      }
    },
    validationRpc: async (method, params) => {
      state.calls.push({ phase: 'final', method }); await state.onRpc?.('final', method)
      let result
      if (method === 'getblockchaininfo') result = { chain: 'regtest', blocks: 1_000, bestblockhash: state.tip }
      else if (method === 'gettxout') result = { value: 50, bestblock: state.tip, scriptPubKey: { hex: plan.scriptPubKeyHex } }
      else {
        const hex = method === 'decoderawtransaction' ? params[0] : params[0][0]
        const parsed = inspectFinalTransaction({ program, intent: fixtureIntent(plan, outpoint), rawTransactionHex: hex })
        result = method === 'decoderawtransaction' ? { txid: parsed.txid, hash: parsed.wtxid, weight: parsed.weight, vsize: parsed.vsize, size: parsed.size } :
          [{ txid: parsed.txid, wtxid: parsed.wtxid, allowed: true, vsize: parsed.vsize, fees: { base: 0.0001 } }]
      }
      return state.mutateCore?.(method, result) ?? result
    },
    adapter: { async requestSignature({ request, signal }) {
      state.signCalls++; state.outgoing = request; state.signal = signal
      await state.onSign?.(request)
      const raw = state.raw ?? signedFixtureSpend({ plan, outpoint }).rawHex
      const response = fixtureSignerResponse(request, state.wrongDevice ? other.privateKey : device.privateKey, raw)
      state.response = response
      state.mutateResponse?.(response)
      return response
    } },
  }
  const input = () => {
    const request = { program: { ...program }, psbtBase64: fixturePsbt({ plan, outpoint }), intent: structuredClone(fixtureIntent(plan, outpoint)) }
    request.approval = fixtureApproval(request, keys.privateKey, { nonce: (++state.serial).toString(16).padStart(64, '0') })
    return { token: issueNeopassToken({ subject, secret, now: () => 1_000_000, ttlSeconds: 200 }), request }
  }
  return { state, store, options, input, workflow: createExternalSigningWorkflow(options) }
}

test('identity-bound external signing validates actual wire bytes and returns only audit hashes', async t => {
  const s = setup(t), result = await s.workflow.signAndValidate(s.input())
  assert.equal(result.validation, 'FINAL_TRANSACTION_VALIDATED'); assert.equal(result.broadcast, false)
  assert.equal(result.signingLocation, 'external-adapter'); assert.equal(result.applicationPrivateKeysLoaded, false)
  assert.equal(s.state.signCalls, 1); assert.equal(s.store.inspect().consumedApprovals, 1)
  assert.equal(s.state.reads, 6)
  assert.equal(Object.isFrozen(s.state.outgoing), true); assert.equal(Object.isFrozen(s.state.outgoing.intent.outputs[0]), true)
  assert.equal('token' in s.state.outgoing, false); assert.equal('rawTransactionHex' in result, false)
  assert.equal(s.state.calls.filter(x => x.method === 'testmempoolaccept').length, 1)
})

test('used approval and caller-supplied review receipt cannot trigger a second signing call', async t => {
  const s = setup(t), input = s.input(), receipt = await s.workflow.signAndValidate(input)
  await assert.rejects(() => s.workflow.signAndValidate(input), code('PSBT_APPROVAL_REPLAYED'))
  await assert.rejects(() => s.workflow.signAndValidate({ token: input.token, receipt }))
  assert.equal(s.state.signCalls, 1)
})

test('unconfigured signer keys, approvers, adapters and private proof keys are rejected', async t => {
  const s = setup(t)
  for (const signer of [{ ...s.options.signer, publicKey: device.privateKey }, { ...s.options.signer, bitcoinPublicKeys: ['02' + 'ff'.repeat(32)] }]) assert.throws(() => createExternalSigningWorkflow({ ...s.options, signer }))
  assert.throws(() => createExternalSigningWorkflow({ ...s.options, adapter: {} }), code('SIGNER_ADAPTER_CONFIGURATION_REQUIRED'))
  const workflow = createExternalSigningWorkflow({ ...s.options, signer: { ...s.options.signer, bitcoinPublicKeys: [fixtureKey(3).publicKeyHex] } })
  await assert.rejects(() => workflow.signAndValidate(s.input()), code('SIGNER_NOT_PERMITTED_FOR_REQUEST'))
  assert.equal(s.store.inspect().consumedApprovals, 0)
})

test('invalid NEOpass or forged approval never reaches the signer', async t => {
  const s = setup(t), badSession = s.input(), badApproval = s.input(); badSession.token = 'invalid'
  badApproval.request.approval = fixtureApproval(badApproval.request, other.privateKey)
  await assert.rejects(() => s.workflow.signAndValidate(badSession), code('PSBT_NEOPASS_SESSION_INVALID'))
  await assert.rejects(() => s.workflow.signAndValidate(badApproval), code('PSBT_APPROVAL_SIGNATURE_INVALID'))
  assert.equal(s.state.signCalls, 0)
})

test('identity revoked at the signing boundary consumes approval but makes no device call', async t => {
  const s = setup(t); s.state.onRegistry = async read => { if (read === 4) s.state.active = false }
  await assert.rejects(() => s.workflow.signAndValidate(s.input()), code('PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED'))
  assert.equal(s.state.signCalls, 0); assert.equal(s.store.inspect().consumedApprovals, 1)
})

test('device response signatures and all request, expiry, network and presence bindings are mandatory', async t => {
  const s = setup(t)
  for (const mutate of [r => { r.requestId = 'ff'.repeat(32) }, r => { r.requestHash = 'ff'.repeat(32) }, r => { r.signerId = 'other' },
    r => { r.expiresAt++ }, r => { r.signatureHex = '00'.repeat(64) }, r => { r.network = 'mainnet' }, r => { r.userPresenceAttested = false }, r => { r.private_key = 'TEST_ONLY' }]) {
    s.state.mutateResponse = mutate
    await assert.rejects(() => s.workflow.signAndValidate(s.input()))
  }
  s.state.mutateResponse = undefined; s.state.wrongDevice = true
  await assert.rejects(() => s.workflow.signAndValidate(s.input()), code('SIGNER_RESPONSE_SIGNATURE_OR_BINDING_INVALID'))
  assert.equal(s.state.calls.some(x => x.phase === 'final'), false)
})

test('response timeout aborts once and burns the approval without automatic retry', async t => {
  const s = setup(t)
  const workflow = createExternalSigningWorkflow({ ...s.options, timeoutMs: 20,
    adapter: { requestSignature({ signal }) { s.state.signCalls++; s.state.signal = signal; return new Promise(() => {}) } } })
  const input = s.input()
  await assert.rejects(() => workflow.signAndValidate(input), code('SIGNER_RESPONSE_TIMEOUT'))
  assert.equal(s.state.signal.aborted, true); assert.equal(s.state.signCalls, 1)
  await assert.rejects(() => workflow.signAndValidate(input), code('PSBT_APPROVAL_REPLAYED'))
  assert.equal(s.state.signCalls, 1)
})

test('adapter exceptions expose no private transport details and cannot be retried with the same approval', async t => {
  const s = setup(t), workflow = createExternalSigningWorkflow({ ...s.options, adapter: { requestSignature() { throw Error('private transport credential') } } })
  const input = s.input()
  await assert.rejects(() => workflow.signAndValidate(input), error => error.code === 'SIGNER_ADAPTER_FAILED' && !error.message.includes('credential'))
  await assert.rejects(() => workflow.signAndValidate(input), code('PSBT_APPROVAL_REPLAYED'))
})

test('identity revocation or request expiry during external signing denies the result', async t => {
  const s = setup(t); s.state.onSign = async () => { s.state.active = false }
  await assert.rejects(() => s.workflow.signAndValidate(s.input()), code('PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED'))
  s.state.active = true; s.state.onSign = async request => { s.state.clock = request.expiresAt }
  await assert.rejects(() => s.workflow.signAndValidate(s.input()), code('SIGNER_AUTHORIZATION_EXPIRED'))
})

test('identity is checked again after final Core validation', async t => {
  const s = setup(t); s.state.onRpc = async (phase, method) => { if (phase === 'final' && method === 'testmempoolaccept') s.state.active = false }
  await assert.rejects(() => s.workflow.signAndValidate(s.input()), code('PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED'))
  assert.equal(s.store.inspect().consumedApprovals, 1)
})

test('caller and adapter mutation cannot substitute the signed request or returned raw transaction', async t => {
  const s = setup(t), input = s.input(), original = input.request.psbtBase64
  s.state.onRegistry = async read => { if (read === 1) { input.request.psbtBase64 = 'changed'; input.request.program.network = 'mainnet'; input.request.intent.outputs[0].valueSats = '1'; input.request.approval.expiresAt = 999_999 } }
  s.state.onRpc = async (phase, method) => { if (phase === 'final' && method === 'getblockchaininfo') s.state.response.rawTransactionHex = '00' }
  const result = await s.workflow.signAndValidate(input)
  assert.equal(result.validation, 'FINAL_TRANSACTION_VALIDATED'); assert.equal(s.state.outgoing.psbtBase64, original)
})

test('wire parser rejects changed outputs, input, locktime, sequence, witness and preimage', t => {
  const valid = signedFixtureSpend({ plan, outpoint }), inspect = rawTransactionHex => inspectFinalTransaction({ program, intent: fixtureIntent(plan, outpoint), rawTransactionHex })
  const variants = [
    fixtureTransaction({ outpoint, amountSats: 4_999_980_000n, witnessHex: valid.witnessHex }).rawHex,
    fixtureTransaction({ outpoint, outputScriptHex: '0014' + '22'.repeat(20), witnessHex: valid.witnessHex }).rawHex,
    fixtureTransaction({ outpoint: { ...outpoint, vout: 1 }, witnessHex: valid.witnessHex }).rawHex,
    fixtureTransaction({ outpoint, lockTime: 1, witnessHex: valid.witnessHex }).rawHex,
    fixtureTransaction({ outpoint, sequence: 0xffffffff, witnessHex: valid.witnessHex }).rawHex,
    fixtureTransaction({ outpoint, witnessHex: [valid.witnessHex[0], '02'.repeat(32), '01', plan.witnessScriptHex] }).rawHex,
    fixtureTransaction({ outpoint, witnessHex: [valid.witnessHex[0], preimageHex, '02', plan.witnessScriptHex] }).rawHex,
    fixtureTransaction({ outpoint, witnessHex: [valid.witnessHex[0].slice(0, -2) + '02', preimageHex, '01', plan.witnessScriptHex] }).rawHex,
    valid.rawHex + '00', valid.rawHex.slice(0, -2), valid.rawHex.replace(/^02000000000101/, '020000000001fd0100'), '00', '00'.repeat(65_537),
  ]
  for (const raw of variants) assert.throws(() => inspect(raw))
  assert.equal(inspect(valid.rawHex).weight < 400_000, true)
})

test('refund wire profile requires the exact refund branch and locktime', () => {
  const signed = signedFixtureSpend({ plan, outpoint, branch: 'refund' })
  const result = inspectFinalTransaction({ program, intent: fixtureIntent(plan, outpoint, 'refund'), rawTransactionHex: signed.rawHex })
  assert.equal(result.normalizedIntent.branch, 'refund')
  assert.throws(() => inspectFinalTransaction({ program, intent: fixtureIntent(plan, outpoint), rawTransactionHex: signed.rawHex }))
})

test('Core decode, mempool identity, fee and weight disagreements fail closed', async t => {
  const s = setup(t)
  const mutations = [
    ['decoderawtransaction', r => ({ ...r, txid: 'ff'.repeat(32) })], ['decoderawtransaction', r => ({ ...r, weight: r.weight + 1 })],
    ['testmempoolaccept', r => [{ ...r[0], wtxid: 'ff'.repeat(32) }]], ['testmempoolaccept', r => [{ ...r[0], allowed: false }]],
    ['testmempoolaccept', r => [{ ...r[0], fees: { base: 0.0002 } }]], ['testmempoolaccept', r => [{ ...r[0], vsize: 1 }]],
  ]
  for (const [method, mutate] of mutations) {
    s.state.mutateCore = (name, result) => name === method ? mutate(result) : result
    await assert.rejects(() => s.workflow.signAndValidate(s.input()))
  }
})

test('changed UTXO amount, missing UTXO and moving chain tip reject the signed transaction', async t => {
  const s = setup(t)
  s.state.mutateCore = (method, r) => method === 'gettxout' ? { ...r, value: 49 } : r
  await assert.rejects(() => s.workflow.signAndValidate(s.input()), code('SIGNER_FINAL_FEE_CHANGED'))
  s.state.mutateCore = (method, r) => method === 'gettxout' ? false : r
  await assert.rejects(() => s.workflow.signAndValidate(s.input()), code('SIGNER_FINAL_UTXO_CHANGED'))
  s.state.mutateCore = undefined
  s.state.onRpc = async (phase, method) => { if (phase === 'final' && method === 'testmempoolaccept') s.state.tip = 'bb'.repeat(32) }
  await assert.rejects(() => s.workflow.signAndValidate(s.input()), code('SIGNER_CHAIN_CHANGED_DURING_VALIDATION'))
})

test('standalone final validation snapshots review context before awaits', async t => {
  const s = setup(t), request = { program: { ...program }, intent: structuredClone(fixtureIntent(plan, outpoint)), rawTransactionHex: signedFixtureSpend({ plan, outpoint }).rawHex, expectedFeeSats: 10_000, maximumSignedWeight: 1_000 }
  s.state.onRpc = async () => { request.expectedFeeSats = 1; request.maximumSignedWeight = 1; request.rawTransactionHex = '00'; request.intent.outputs[0].valueSats = '1' }
  const result = await verifyFinalTransaction(request, { rpc: s.options.validationRpc })
  assert.equal(result.feeSats, 10_000)
})

test('configured signer permissions, device key and adapter are captured at construction', async t => {
  const s = setup(t)
  s.options.signer.publicKey = other.publicKey; s.options.signer.bitcoinPublicKeys.length = 0; s.options.signer.approverIds.length = 0
  s.options.adapter.requestSignature = () => { throw Error('replacement adapter') }
  const result = await s.workflow.signAndValidate(s.input())
  assert.equal(result.validation, 'FINAL_TRANSACTION_VALIDATED')
})

test('session expiry during final Core validation denies a previously signed transaction', async t => {
  const s = setup(t)
  s.state.onRpc = async (phase, method) => { if (phase === 'final' && method === 'testmempoolaccept') s.state.clock = 1_200 }
  await assert.rejects(() => s.workflow.signAndValidate(s.input()), code('PSBT_NEOPASS_SESSION_INVALID'))
  assert.equal(s.store.inspect().consumedApprovals, 1)
})
