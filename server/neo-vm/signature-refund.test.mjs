import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { compileSignatureRefund } from '../../core/neo-nvm/signature-refund.mjs'
import { authorizePsbtReview, psbtReviewCommitments } from './psbt-authorization.mjs'
import { createRestrictedPsbtBitcoinRpc } from './shared-bitcoin-core.mjs'
import { fixtureKey, fixturePsbt, fixtureIntent, fixtureApproval } from '../../scripts/test-support/neo-vm-fixtures.mjs'

const program = {
  schemaVersion: 1, family: 'bitcoin', network: 'regtest', kind: 'sha256-signature-refund-v1',
  digestHex: '11'.repeat(32), redeemPublicKeyHex: fixtureKey(1).publicKeyHex,
  refundPublicKeyHex: fixtureKey(2).publicKeyHex, refundHeight: 128,
}
const plan = compileSignatureRefund(program)
const outpoint = { txid: 'ab'.repeat(32), vout: 0 }
const keys = generateKeyPairSync('ed25519')
const code = expected => error => error.code === expected
function setup({ mutateDecoded, chain = 'regtest', blocks = 1_000, mutateUtxo } = {}) {
  const request = { program, psbtBase64: fixturePsbt({ plan, outpoint }), intent: fixtureIntent(plan, outpoint) }
  request.approval = fixtureApproval(request, keys.privateKey)
  const calls = [], consumed = new Set()
  const decoded = {
    psbt_version: 0,
    tx: { version: 2, locktime: 0, weight: 328, vin: [{ ...outpoint, sequence: 0xfffffffd, scriptSig: { hex: '' } }],
      vout: [{ value: 49.9999, scriptPubKey: { hex: '0014' + '11'.repeat(20) } }] },
    inputs: [{ witness_utxo: { amount: 50, scriptPubKey: { hex: plan.scriptPubKeyHex } }, witness_script: { hex: plan.witnessScriptHex }, sighash: 'ALL' }],
    outputs: [{}],
  }
  mutateDecoded?.(decoded)
  const options = {
    approverId: 'fixture-operator', approverPublicKey: keys.publicKey, now: () => 1_100,
    consumeApproval: async key => { if (consumed.has(key)) return false; consumed.add(key); return true },
    rpc: async (method, params) => {
      calls.push([method, params])
      if (method === 'getblockchaininfo') return { chain, blocks }
      if (method === 'decodepsbt') return decoded
      if (method === 'gettxout') { const u = { value: 50, confirmations: 101, coinbase: true, scriptPubKey: { hex: plan.scriptPubKeyHex } }; mutateUtxo?.(u); return u }
      throw new Error('UNEXPECTED_RPC')
    },
  }
  return { request, options, calls, consumed }
}

test('compiles distinct-key signature/hashlock redemption and block-height refund Script', () => {
  assert.match(plan.witnessScriptHex, /^6382012088a820/)
  assert.ok(plan.witnessScriptHex.includes('ac67028000b17521'))
  assert.ok(plan.witnessScriptHex.endsWith('ac68'))
  assert.equal(plan.localSubsetSupported, false)
  assert.equal(plan.executionAuthority, 'Bitcoin Core')
  assert.deepEqual(compileSignatureRefund({ ...program, digestHex: program.digestHex.toUpperCase() }), plan)
})

test('rejects foreign networks, malformed keys, duplicate keys, timestamps and unknown fields', () => {
  for (const change of [
    { network: 'mainnet' }, { family: 'ethereum' }, { kind: 'evm-call' }, { schemaVersion: 2 },
    { refundPublicKeyHex: program.redeemPublicKeyHex }, { redeemPublicKeyHex: '02' + 'ff'.repeat(32) },
    { refundPublicKeyHex: '04' + '11'.repeat(64) }, { refundHeight: 0 }, { refundHeight: 1.5 },
    { refundHeight: 500_000_000 }, { digestHex: 'aa' }, { privateKey: 'forbidden' },
  ]) assert.throws(() => compileSignatureRefund({ ...program, ...change }))
})

test('height operands use minimal Script-number encoding across boundaries', () => {
  for (const [height, push] of [[1, '51'], [16, '60'], [17, '0111'], [127, '017f'], [128, '028000'], [256, '020001']]) {
    assert.ok(compileSignatureRefund({ ...program, refundHeight: height }).witnessScriptHex.includes(`ac67${push}b175`))
  }
})

test('valid signed review is bound to the exact PSBT and intent and consumes one nonce', async () => {
  const { request, options, calls, consumed } = setup()
  const result = await authorizePsbtReview(request, options)
  assert.equal(result.authorization, 'REVIEW_APPROVED')
  assert.equal(result.bitcoinSignatureCreated, false)
  assert.equal(result.broadcast, false)
  assert.equal(result.feeSats, 10_000)
  assert.equal(consumed.size, 1)
  assert.deepEqual(calls.map(c => c[0]), ['getblockchaininfo', 'decodepsbt', 'gettxout'])
  await assert.rejects(() => authorizePsbtReview(request, options), code('PSBT_APPROVAL_REPLAYED'))
})

test('concurrent replays cannot both consume the atomic approval', async () => {
  const { request, options } = setup()
  const results = await Promise.allSettled([authorizePsbtReview(request, options), authorizePsbtReview(request, options)])
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1)
  assert.equal(results.filter(r => r.status === 'rejected' && r.reason.code === 'PSBT_APPROVAL_REPLAYED').length, 1)
})

test('missing authority/store, caller-controlled booleans and private approval keys fail closed', async () => {
  const { request, options, calls } = setup()
  for (const change of [{ consumeApproval: undefined }, { approverPublicKey: undefined }, { approverPublicKey: keys.privateKey }, { approverPublicKey: true }, { approverId: '' }]) {
    await assert.rejects(() => authorizePsbtReview(request, { ...options, ...change }))
  }
  assert.equal(calls.length, 0)
})

test('tampered PSBT, intent, authorizer, proof and wrong approval key are rejected before RPC', async () => {
  for (const mutate of [
    r => { r.psbtBase64 = fixturePsbt({ plan, outpoint, amountSats: 4_999_980_000n }) },
    r => { r.intent.outputs = [{ ...r.intent.outputs[0], scriptPubKeyHex: '0014' + '22'.repeat(20) }] },
    r => { r.approval.authorizerId = 'another-operator' },
    r => { r.approval.signatureHex = '00'.repeat(64) },
  ]) {
    const { request, options, calls } = setup(); mutate(request)
    await assert.rejects(() => authorizePsbtReview(request, options), code('PSBT_APPROVAL_SIGNATURE_INVALID'))
    assert.equal(calls.length, 0)
  }
  const { request, options, calls } = setup()
  await assert.rejects(() => authorizePsbtReview(request, { ...options, approverPublicKey: generateKeyPairSync('ed25519').publicKey }), code('PSBT_APPROVAL_SIGNATURE_INVALID'))
  assert.equal(calls.length, 0)
})

test('expiry, future approvals and expiration during Core reads consume no nonce', async () => {
  for (const timestamp of [999, 1200, 1300]) {
    const { request, options, calls, consumed } = setup()
    await assert.rejects(() => authorizePsbtReview(request, { ...options, now: () => timestamp }), code('PSBT_APPROVAL_EXPIRED'))
    assert.equal(calls.length, 0); assert.equal(consumed.size, 0)
  }
  const { request, options, consumed } = setup(); let n = 0
  await assert.rejects(() => authorizePsbtReview(request, { ...options, now: () => n++ ? 1200 : 1100 }), code('PSBT_APPROVAL_EXPIRED'))
  assert.equal(consumed.size, 0)
})

test('caller mutation during RPC cannot replace the authenticated PSBT or nonce', async () => {
  const { request, options, calls, consumed } = setup()
  const originalPsbt = request.psbtBase64
  const rpc = options.rpc
  options.rpc = async (method, params) => {
    if (method === 'getblockchaininfo') {
      request.psbtBase64 = fixturePsbt({ plan, outpoint, amountSats: 4_999_980_000n })
      request.approval.nonce = 'ff'.repeat(32)
    }
    return rpc(method, params)
  }
  await authorizePsbtReview(request, options)
  assert.equal(calls.find(c => c[0] === 'decodepsbt')[1][0], originalPsbt)
  assert.ok([...consumed][0].endsWith('01'.repeat(32)))
})

test('mutating an approval object cannot extend its signed expiry', async () => {
  const { request, options, consumed } = setup()
  const rpc = options.rpc; let time = 1100
  options.now = () => time
  options.rpc = async (method, params) => {
    request.approval.expiresAt = 999999
    time = 1200
    return rpc(method, params)
  }
  await assert.rejects(() => authorizePsbtReview(request, options), code('PSBT_APPROVAL_EXPIRED'))
  assert.equal(consumed.size, 0)
})

test('an approval that expires during nonce reservation cannot return authorization', async () => {
  const { request, options, consumed } = setup(); let time = 1100
  options.now = () => time
  const consume = options.consumeApproval
  options.consumeApproval = async (...args) => { const result = await consume(...args); time = 1200; return result }
  await assert.rejects(() => authorizePsbtReview(request, options), code('PSBT_APPROVAL_EXPIRED'))
  assert.equal(consumed.size, 1) // Reservation remains consumed; never roll it back.
})

test('foreign Core chain and premature refund review are rejected', async () => {
  const a = setup({ chain: 'main' })
  await assert.rejects(() => authorizePsbtReview(a.request, a.options), code('PSBT_REGTEST_REQUIRED'))
  const b = setup({ blocks: 127 })
  b.request.intent = fixtureIntent(plan, outpoint, 'refund')
  b.request.psbtBase64 = fixturePsbt({ plan, outpoint, branch: 'refund' })
  b.request.approval = fixtureApproval(b.request, keys.privateKey)
  await assert.rejects(() => authorizePsbtReview(b.request, b.options), code('PSBT_REFUND_NOT_MATURE'))
  assert.equal(b.consumed.size, 0)
})

test('PSBT metadata and transaction-context mutations do not consume approval', async () => {
  const mutations = [
    d => { d.psbt_version = 2 }, d => { d.global_xpubs = [{ xpub: 'unreviewed' }] },
    d => { d.unknown = { aa: '01' } }, d => { d.tx.vin.push(d.tx.vin[0]) },
    d => { d.tx.vin[0].txid = 'cd'.repeat(32) }, d => { d.tx.locktime = 1 },
    d => { d.tx.vin[0].sequence = 0xffffffff }, d => { d.tx.vout[0].value = 49.9998 },
    d => { d.tx.vout[0].scriptPubKey.hex = '0014' + '22'.repeat(20) },
    d => { d.inputs[0].sighash = 'NONE' }, d => { d.inputs[0].partial_signatures = { key: 'sig' } },
    d => { d.inputs[0].final_scriptwitness = ['01'] }, d => { d.inputs[0].witness_script.hex = '51' },
    d => { d.inputs[0].witness_utxo.amount = 49 }, d => { d.tx.weight = 400000 },
    d => { d.outputs[0].unknown = { aa: '01' } },
  ]
  for (const mutateDecoded of mutations) {
    const { request, options, consumed } = setup({ mutateDecoded })
    await assert.rejects(() => authorizePsbtReview(request, options))
    assert.equal(consumed.size, 0)
  }
})

test('fee cap, real UTXO context and previous-transaction binding are enforced', async () => {
  for (const mutateUtxo of [u => { u.value = 50.1 }, u => { u.scriptPubKey.hex = '51' }, u => { u.confirmations = 99 }]) {
    const a = setup({ mutateUtxo })
    await assert.rejects(() => authorizePsbtReview(a.request, a.options))
    assert.equal(a.consumed.size, 0)
  }
  const a = setup({ mutateDecoded: d => { d.inputs[0].non_witness_utxo = { txid: 'ff'.repeat(32), vout: [] } } })
  await assert.rejects(() => authorizePsbtReview(a.request, a.options), code('PSBT_PREVIOUS_TRANSACTION_MISMATCH'))
  const b = setup(); b.request.intent.maxFeeSats = '9999'; b.request.approval = fixtureApproval(b.request, keys.privateKey)
  await assert.rejects(() => authorizePsbtReview(b.request, b.options), code('PSBT_FEE_OUT_OF_BOUNDS'))
})

test('noncanonical and oversized PSBTs, invalid intent fields and excessive proof lifetime are rejected', () => {
  const a = setup()
  for (const psbtBase64 of [a.request.psbtBase64 + '\n', 'a'.repeat(90001), 'AA==']) {
    assert.throws(() => psbtReviewCommitments(psbtBase64, a.request.intent, program))
  }
  for (const change of [{ network: 'ethereum' }, { maxFeeSats: '0100' }, { maxFeeSats: '100001' }, { sequence: 0xffffffff }, { extra: true }]) {
    assert.throws(() => psbtReviewCommitments(a.request.psbtBase64, { ...a.request.intent, ...change }, program))
  }
  assert.throws(() => fixtureApproval(a.request, keys.privateKey, { expiresAt: 1301 }))
})

test('PSBT RPC profile only permits three read-only methods', async () => {
  const calls = []
  const rpc = createRestrictedPsbtBitcoinRpc({ url: 'http://127.0.0.1:18443/', auth: 'fixture:only', fetchImpl: async (_url, options) => { calls.push(JSON.parse(options.body).method); return { ok: true, json: async () => ({ result: {} }) } } })
  for (const method of ['getblockchaininfo', 'decodepsbt', 'gettxout']) await rpc(method, [])
  for (const method of ['walletprocesspsbt', 'signrawtransactionwithkey', 'sendrawtransaction', 'testmempoolaccept', 'stop']) await assert.rejects(() => rpc(method, []), /PSBT_RPC_METHOD_FORBIDDEN/)
  assert.equal(calls.length, 3)
})
