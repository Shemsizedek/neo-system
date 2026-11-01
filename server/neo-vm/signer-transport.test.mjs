import test from 'node:test'
import assert from 'node:assert/strict'
import { generateKeyPairSync } from 'node:crypto'
import { createExternalSignerClient } from './signer-transport.mjs'
import { canonicalSignerRequest, verifySignerOperatorApproval, signerRequestHash } from './signer-protocol.mjs'
import { compileSignatureRefund } from '../../core/neo-nvm/signature-refund.mjs'
import { sha256Hex } from '../../core/neo-bvm/runtime.mjs'
import { fixtureKey, fixturePsbt, fixtureIntent, fixtureApproval } from '../../scripts/test-support/neo-vm-fixtures.mjs'

const keys = generateKeyPairSync('ed25519'), token = 'TEST_ONLY_TRANSPORT_TOKEN_'.repeat(2)
const code = expected => error => error.code === expected
function request() {
  const program = { schemaVersion: 1, family: 'bitcoin', network: 'regtest', kind: 'sha256-signature-refund-v1', digestHex: '11'.repeat(32),
    redeemPublicKeyHex: fixtureKey(1).publicKeyHex, refundPublicKeyHex: fixtureKey(2).publicKeyHex, refundHeight: 128 }
  const plan = compileSignatureRefund(program), outpoint = { txid: 'ab'.repeat(32), vout: 0 }
  const review = { program, psbtBase64: fixturePsbt({ plan, outpoint }), intent: fixtureIntent(plan, outpoint) }
  const approval = fixtureApproval(review, keys.privateKey)
  return canonicalSignerRequest({ version: 1, network: 'regtest', signerId: 'fixture-device', requestId: '01'.repeat(32), issuedAt: 1_100, expiresAt: 1_130,
    ...review, psbtHash: approval.psbtHash, intentHash: approval.intentHash, approval, neopassSubjectHash: '22'.repeat(32),
    approvalKeyHash: sha256Hex(keys.publicKey.export({ type: 'spki', format: 'der' })) })
}
const input = () => ({ request: request(), signal: new AbortController().signal })

test('signer transport requires fixed HTTPS or loopback HTTP endpoint and bounded credentials', () => {
  for (const url of [undefined, 'http://remote.example/v1/neo-vm/sign', 'https://a:b@signer.example/v1/neo-vm/sign', 'https://signer.example/other', 'https://signer.example/v1/neo-vm/sign?q=x', 'https://signer.example/v1/neo-vm/sign#x']) assert.throws(() => createExternalSignerClient({ url, authenticationToken: token }))
  for (const authenticationToken of ['', 'short', token + '\nInjected: yes']) assert.throws(() => createExternalSignerClient({ url: 'https://signer.example/v1/neo-vm/sign', authenticationToken }), code('SIGNER_TRANSPORT_AUTH_REQUIRED'))
})

test('transport sends one authenticated JSON request without sessions, redirects or browser credentials', async () => {
  let calls = 0
  const client = createExternalSignerClient({ url: 'https://signer.example/v1/neo-vm/sign', authenticationToken: token, fetchImpl: async (url, options) => {
    calls++; assert.equal(url, 'https://signer.example/v1/neo-vm/sign'); assert.equal(options.headers.Authorization, 'Bearer ' + token)
    assert.equal(options.redirect, 'error'); assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store')
    assert.equal(Object.hasOwn(JSON.parse(options.body), 'token'), false)
    return new Response('{"fixture":true}', { headers: { 'content-type': 'application/json' } })
  } })
  assert.deepEqual(await client.requestSignature(input()), { fixture: true }); assert.equal(calls, 1)
})

test('oversized streamed and advertised responses are cancelled before JSON parsing', async () => {
  let cancelled = false
  const stream = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(140_001)) }, cancel() { cancelled = true } })
  const client = createExternalSignerClient({ url: 'https://signer.example/v1/neo-vm/sign', authenticationToken: token,
    fetchImpl: async () => new Response(stream, { headers: { 'content-type': 'application/json' } }) })
  await assert.rejects(() => client.requestSignature(input()), code('SIGNER_RESPONSE_TOO_LARGE')); assert.equal(cancelled, true)
  const advertised = createExternalSignerClient({ url: 'https://signer.example/v1/neo-vm/sign', authenticationToken: token,
    fetchImpl: async () => new Response('{}', { headers: { 'content-type': 'application/json', 'content-length': '140001' } }) })
  await assert.rejects(() => advertised.requestSignature(input()), code('SIGNER_TRANSPORT_RESPONSE_INVALID'))
})

test('redirects, non-JSON, malformed JSON and connection failures expose only bounded errors', async () => {
  for (const response of [new Response('{}', { status: 302, headers: { location: 'https://attacker.example' } }), new Response('{}'), new Response('bad json', { headers: { 'content-type': 'application/json' } })]) {
    const client = createExternalSignerClient({ url: 'https://signer.example/v1/neo-vm/sign', authenticationToken: token, fetchImpl: async () => response })
    await assert.rejects(() => client.requestSignature(input()), code('SIGNER_TRANSPORT_RESPONSE_INVALID'))
  }
  const broken = createExternalSignerClient({ url: 'https://signer.example/v1/neo-vm/sign', authenticationToken: token, fetchImpl: async () => { throw Error(token) } })
  await assert.rejects(() => broken.requestSignature(input()), error => error.code === 'SIGNER_TRANSPORT_UNAVAILABLE' && !error.message.includes(token))
})

test('device-side verification requires the independently pinned operator proof key', () => {
  const r = request()
  assert.equal(verifySignerOperatorApproval(r, keys.publicKey).approval.authorizerId, 'fixture-operator')
  assert.throws(() => verifySignerOperatorApproval(r, generateKeyPairSync('ed25519').publicKey), code('SIGNER_OPERATOR_APPROVAL_INVALID'))
  assert.throws(() => canonicalSignerRequest({ ...r, psbtHash: 'ff'.repeat(32) }), code('SIGNER_REQUEST_COMMITMENT_MISMATCH'))
  assert.throws(() => canonicalSignerRequest({ ...r, expiresAt: 1_131 }), code('SIGNER_REQUEST_INVALID'))
})

test('operator proof hex is normalized without changing its signature or request commitment', () => {
  const original = request(), changed = { ...original, approval: { ...original.approval,
    signatureHex: original.approval.signatureHex.toUpperCase(), psbtHash: original.approval.psbtHash.toUpperCase(), intentHash: original.approval.intentHash.toUpperCase() } }
  assert.equal(signerRequestHash(original), signerRequestHash(changed))
  assert.equal(verifySignerOperatorApproval(changed, keys.publicKey).approval.signatureHex, original.approval.signatureHex)
})
