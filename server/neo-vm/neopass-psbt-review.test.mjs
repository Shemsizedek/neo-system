import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync, createHmac } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNeopassPsbtReviewer } from './neopass-psbt-review.mjs'
import { createSqliteApprovalStore } from './approval-store.mjs'
import { issueNeopassToken } from '../neo-platform-api/neopass-google-auth.mjs'
import { compileSignatureRefund } from '../../core/neo-nvm/signature-refund.mjs'
import { fixtureKey, fixturePsbt, fixtureIntent, fixtureApproval } from '../../scripts/test-support/neo-vm-fixtures.mjs'

const keys = generateKeyPairSync('ed25519'), wrong = generateKeyPairSync('ed25519')
const program = { schemaVersion: 1, family: 'bitcoin', network: 'regtest', kind: 'sha256-signature-refund-v1',
  digestHex: '11'.repeat(32), redeemPublicKeyHex: fixtureKey(1).publicKeyHex, refundPublicKeyHex: fixtureKey(2).publicKeyHex, refundHeight: 128 }
const plan = compileSignatureRefund(program), outpoint = { txid: 'ab'.repeat(32), vout: 0 }
const subject = 'google:fixture-operator', secret = 'test-only-neopass-secret-'.repeat(3), issuer = 'neo-pass'
const code = expected => error => error.code === expected
function setup(t) {
  const directory = mkdtempSync(join(tmpdir(), 'neo-vm-identity-')), stores = []
  const state = { clock: 1_100, calls: [], registryReads: 0,
    credential: { subject, provider: 'google', providerSubject: 'fixture-operator', status: 'active', role: 'member' } }
  const open = () => { const store = createSqliteApprovalStore({ filename: join(directory, 'approval.sqlite'), now: () => state.clock }); stores.push(store); return store }
  t.after(() => { for (const store of stores) store.close(); rmSync(directory, { recursive: true, force: true }) })
  const decoded = {
    psbt_version: 0,
    tx: { version: 2, locktime: 0, weight: 328, vin: [{ ...outpoint, sequence: 0xfffffffd, scriptSig: { hex: '' } }],
      vout: [{ value: 49.9999, scriptPubKey: { hex: '0014' + '11'.repeat(20) } }] },
    inputs: [{ witness_utxo: { amount: 50, scriptPubKey: { hex: plan.scriptPubKeyHex } }, witness_script: { hex: plan.witnessScriptHex }, sighash: 'ALL' }], outputs: [{}],
  }
  const options = {
    rpc: async (method, params) => {
      state.calls.push({ method, params }); await state.onRpc?.(method)
      return method === 'getblockchaininfo' ? { chain: 'regtest', blocks: 1_000 } : method === 'decodepsbt' ? decoded : { value: 50, scriptPubKey: { hex: plan.scriptPubKeyHex } }
    },
    registry: { async getNEOpassCredential() { state.registryReads++; await state.onRegistry?.(state.registryReads); if (state.registryError) throw Error('private registry detail'); return state.credential } },
    jwtSecret: secret, jwtIssuer: issuer,
    bindings: [{ subject, approverId: 'fixture-operator', publicKey: keys.publicKey }], approvalStore: open(), now: () => state.clock,
  }
  const makeRequest = () => {
    const request = { program: { ...program }, psbtBase64: fixturePsbt({ plan, outpoint }), intent: structuredClone(fixtureIntent(plan, outpoint)) }
    request.approval = fixtureApproval(request, keys.privateKey)
    return request
  }
  const token = (overrides = {}) => issueNeopassToken({ subject, secret, issuer, now: () => 1_000_000, ...overrides })
  return { state, options, open, makeRequest, token, reviewer: createNeopassPsbtReviewer(options) }
}
const invoke = s => s.reviewer.review({ token: s.token(), request: s.makeRequest() })

test('NEOpass session, active registry membership and pinned approval key yield a durable review', async t => {
  const s = setup(t), receipt = await invoke(s)
  assert.equal(receipt.authorization, 'REVIEW_APPROVED')
  assert.equal(receipt.approvalStore, 'sqlite')
  assert.equal(receipt.identitySource, 'authoritative-neopass-registry')
  assert.equal(receipt.bitcoinSignatureCreated, false)
  assert.equal(receipt.broadcast, false)
  assert.equal(s.state.registryReads, 3)
  assert.equal(s.options.approvalStore.inspect().consumedApprovals, 1)
  assert.equal(JSON.stringify(receipt).includes(subject), false)
  assert.equal(s.reviewer.inspectConfiguration().tokenClaimRolesTrusted, false)
})

test('identity-bound approval replay is rejected after reviewer and database restart', async t => {
  const s = setup(t)
  await invoke(s); s.options.approvalStore.close()
  const reviewer = createNeopassPsbtReviewer({ ...s.options, approvalStore: s.open() })
  await assert.rejects(() => reviewer.review({ token: s.token(), request: s.makeRequest() }), code('PSBT_APPROVAL_REPLAYED'))
})

test('two reviewer instances sharing a database cannot approve the same nonce twice', async t => {
  const s = setup(t), second = createNeopassPsbtReviewer({ ...s.options, approvalStore: s.open() })
  const input = { token: s.token(), request: s.makeRequest() }
  const results = await Promise.allSettled([s.reviewer.review(input), second.review(input)])
  assert.equal(results.filter(x => x.status === 'fulfilled').length, 1)
  assert.equal(results.find(x => x.status === 'rejected').reason.code, 'PSBT_APPROVAL_REPLAYED')
})

test('missing durable storage, trust, registry or valid public bindings block configuration', t => {
  const s = setup(t)
  for (const [overrides, expected] of [
    [{ approvalStore: { consumeApproval: () => true } }, 'PSBT_DURABLE_APPROVAL_STORE_REQUIRED'],
    [{ registry: {} }, 'PSBT_NEOPASS_REGISTRY_REQUIRED'], [{ jwtSecret: 'weak' }, 'PSBT_NEOPASS_TRUST_REQUIRED'],
    [{ jwtIssuer: '' }, 'PSBT_NEOPASS_TRUST_REQUIRED'], [{ bindings: [] }, 'PSBT_NEOPASS_BINDINGS_REQUIRED'],
    [{ bindings: [{ ...s.options.bindings[0], publicKey: keys.privateKey }] }, 'PSBT_NEOPASS_BINDING_INVALID'],
    [{ bindings: [s.options.bindings[0], s.options.bindings[0]] }, 'PSBT_NEOPASS_BINDING_INVALID'],
  ]) assert.throws(() => createNeopassPsbtReviewer({ ...s.options, ...overrides }), code(expected))
})

test('forged, expired, future, malformed and foreign-purpose sessions fail before registry or Core', async t => {
  const s = setup(t)
  const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url')
  const raw = claims => { const body = encode({ alg: 'HS256', typ: 'JWT' }) + '.' + encode(claims); return body + '.' + createHmac('sha256', secret).update(body).digest('base64url') }
  const base = { sub: subject, iss: issuer, iat: 1_000, exp: 1_200 }
  const tokens = ['bad', s.token({ secret: 'wrong' }), s.token({ issuer: 'other' }), s.token({ ttlSeconds: 100 }),
    s.token({ now: () => 1_101_000 }), s.token({ ttlSeconds: 28_801 }),
    ...[{ token_use: 'browser', scope: 'neo:oracle:execute' }, { token_use: 'crown-office-attestation' }, { aud: 'other' }, { nbf: 1_101 }].map(claims => s.token({ claims })),
    raw({ ...base, exp: undefined }), raw({ ...base, iat: undefined }), raw({ ...base, exp: '1200' }), raw({ ...base, iat: -1 }), raw({ ...base, exp: 999 }), 'x'.repeat(8_193)]
  for (const token of tokens) await assert.rejects(() => s.reviewer.review({ token, request: s.makeRequest() }), code('PSBT_NEOPASS_SESSION_INVALID'))
  assert.equal(s.state.calls.length, 0); assert.equal(s.state.registryReads, 0)
})

test('a valid unbound subject or another subject using a pinned signature cannot gain authority', async t => {
  const s = setup(t)
  await assert.rejects(() => s.reviewer.review({ token: s.token({ subject: 'google:another-person' }), request: s.makeRequest() }), code('PSBT_NEOPASS_APPROVER_NOT_BOUND'))
  const reviewer = createNeopassPsbtReviewer({ ...s.options, bindings: [{ subject, approverId: 'another-operator', publicKey: keys.publicKey }] })
  await assert.rejects(() => reviewer.review({ token: s.token(), request: s.makeRequest() }), code('PSBT_APPROVAL_SIGNATURE_INVALID'))
  assert.equal(s.state.calls.length, 0)
})

test('signed executive claims never override inactive, absent or inconsistent registry membership', async t => {
  const s = setup(t)
  for (const record of [null, { ...s.state.credential, status: 'pending' }, { ...s.state.credential, subject: 'google:other' },
    { ...s.state.credential, providerSubject: 'other' }, { ...s.state.credential, provider: 'local' }]) {
    s.state.credential = record
    await assert.rejects(() => s.reviewer.review({ token: s.token({ claims: { role: 'executive-admin', email: 'claimed@example.test' } }), request: s.makeRequest() }), code('PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED'))
  }
  assert.equal(s.state.calls.length, 0)
})

test('registry failures are closed and do not expose private error details', async t => {
  const s = setup(t); s.state.registryError = true
  await assert.rejects(invoke(s), error => error.code === 'PSBT_NEOPASS_REGISTRY_UNAVAILABLE' && !error.message.includes('private'))
  assert.equal(s.state.calls.length, 0)
})

test('a valid session cannot replace the separately pinned Ed25519 proof', async t => {
  const s = setup(t), request = s.makeRequest()
  request.approval = fixtureApproval(request, wrong.privateKey)
  await assert.rejects(() => s.reviewer.review({ token: s.token(), request }), code('PSBT_APPROVAL_SIGNATURE_INVALID'))
  assert.equal(s.state.calls.length, 0); assert.equal(s.options.approvalStore.inspect().consumedApprovals, 0)
})

test('membership suspended during Core review is rejected before nonce reservation', async t => {
  const s = setup(t)
  s.state.onRpc = async method => { if (method === 'gettxout') s.state.credential.status = 'suspended' }
  await assert.rejects(invoke(s), code('PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED'))
  assert.equal(s.options.approvalStore.inspect().consumedApprovals, 0)
})

test('revocation after reservation denies the review and retains the burned nonce', async t => {
  const s = setup(t)
  s.state.onRegistry = async read => { if (read === 3) s.state.credential.status = 'suspended' }
  await assert.rejects(invoke(s), code('PSBT_NEOPASS_ACTIVE_IDENTITY_REQUIRED'))
  assert.equal(s.options.approvalStore.inspect().consumedApprovals, 1)
  s.state.credential.status = 'active'; s.state.onRegistry = undefined
  await assert.rejects(invoke(s), code('PSBT_APPROVAL_REPLAYED'))
})

test('session expiry during Core calls or the registry read grants no approval', async t => {
  const s = setup(t)
  s.state.onRpc = async method => { if (method === 'gettxout') s.state.clock = 1_101 }
  await assert.rejects(() => s.reviewer.review({ token: s.token({ ttlSeconds: 101 }), request: s.makeRequest() }), code('PSBT_NEOPASS_SESSION_INVALID'))
  assert.equal(s.options.approvalStore.inspect().consumedApprovals, 0)
  s.state.clock = 1_100; s.state.onRpc = undefined
  s.state.onRegistry = async () => { s.state.clock = 1_101 }
  await assert.rejects(() => s.reviewer.review({ token: s.token({ ttlSeconds: 101 }), request: s.makeRequest() }), code('PSBT_NEOPASS_SESSION_INVALID'))
})

test('caller mutation during registry I/O cannot change the signed request or configured binding', async t => {
  const s = setup(t), request = s.makeRequest(), originalPsbt = request.psbtBase64
  s.state.onRegistry = async read => {
    if (read !== 1) return
    request.psbtBase64 = 'changed'; request.program.network = 'mainnet'; request.intent.outputs[0].valueSats = '1'
    request.approval.nonce = 'ff'.repeat(32); request.approval.expiresAt = 999_999
    s.options.bindings[0].publicKey = wrong.publicKey; s.options.bindings[0].subject = 'google:other'
  }
  const receipt = await s.reviewer.review({ token: s.token(), request })
  assert.equal(receipt.authorization, 'REVIEW_APPROVED')
  assert.equal(s.state.calls.find(x => x.method === 'decodepsbt').params[0], originalPsbt)
  assert.equal(receipt.expiresAt, 1_200)
})

test('rotating a pinned approval key does not erase the operator nonce history', async t => {
  const s = setup(t); await invoke(s)
  const reviewer = createNeopassPsbtReviewer({ ...s.options, bindings: [{ subject, approverId: 'fixture-operator', publicKey: wrong.publicKey }] })
  const request = s.makeRequest(); request.approval = fixtureApproval(request, wrong.privateKey)
  await assert.rejects(() => reviewer.review({ token: s.token(), request }), code('PSBT_APPROVAL_REPLAYED'))
})
