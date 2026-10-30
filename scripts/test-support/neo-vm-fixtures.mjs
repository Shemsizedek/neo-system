// TEST ONLY. Keys 1, 2 and 3 are public, disposable regtest fixtures.
// Production modules never import this file. Never fund these keys with real BTC.
import { createECDH, createHash, createPrivateKey, sign } from 'node:crypto'
import { psbtApprovalChallenge, psbtReviewCommitments } from '../../server/neo-vm/psbt-authorization.mjs'

const N = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n
const sha = b => createHash('sha256').update(b).digest()
const sha256d = b => sha(sha(b))
export const u32 = n => { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b }
export const u64 = n => { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b }
export function compactSize(n) {
  if (n < 253) return Buffer.from([n])
  const b = Buffer.alloc(3); b[0] = 253; b.writeUInt16LE(n, 1); return b
}
export function vector(b) { return Buffer.concat([compactSize(b.length), b]) }

export function fixtureKey(id) {
  if (![1, 2, 3].includes(id)) throw new Error('PUBLIC_FIXTURE_KEY_ONLY')
  const secret = Buffer.alloc(32); secret[31] = id
  const ecdh = createECDH('secp256k1'); ecdh.setPrivateKey(secret)
  const pub = ecdh.getPublicKey(undefined, 'uncompressed')
  return {
    publicKeyHex: ecdh.getPublicKey('hex', 'compressed'),
    privateKey: createPrivateKey({ format: 'jwk', key: {
      kty: 'EC', crv: 'secp256k1', d: secret.toString('base64url'),
      x: pub.subarray(1, 33).toString('base64url'), y: pub.subarray(33).toString('base64url'),
    } }),
  }
}

function lowS(signature) {
  const rLength = signature[3]
  const r = BigInt('0x' + signature.subarray(4, 4 + rLength).toString('hex'))
  const sOffset = 4 + rLength
  const s = BigInt('0x' + signature.subarray(sOffset + 2).toString('hex'))
  const integer = value => {
    let hex = value.toString(16); if (hex.length % 2) hex = '0' + hex
    let bytes = Buffer.from(hex, 'hex')
    if (bytes[0] & 128) bytes = Buffer.concat([Buffer.from([0]), bytes])
    return Buffer.concat([Buffer.from([2, bytes.length]), bytes])
  }
  const body = Buffer.concat([integer(r), integer(s > N / 2n ? N - s : s)])
  return Buffer.concat([Buffer.from([0x30, body.length]), body])
}

export function fixtureTransaction({ outpoint, amountSats = 4_999_990_000n, outputScriptHex = '0014' + '11'.repeat(20), lockTime = 0, sequence = 0xfffffffd, witnessHex } = {}) {
  const prevout = Buffer.concat([Buffer.from(outpoint.txid, 'hex').reverse(), u32(outpoint.vout)])
  const output = Buffer.concat([u64(amountSats), vector(Buffer.from(outputScriptHex, 'hex'))])
  const input = Buffer.concat([prevout, Buffer.from([0]), u32(sequence)])
  const unsigned = Buffer.concat([u32(2), Buffer.from([1]), input, Buffer.from([1]), output, u32(lockTime)])
  if (!witnessHex) return { unsignedHex: unsigned.toString('hex'), prevout, output }
  const witness = Buffer.concat([compactSize(witnessHex.length), ...witnessHex.map(hex => vector(Buffer.from(hex, 'hex')))])
  const raw = Buffer.concat([u32(2), Buffer.from('000101', 'hex'), input, Buffer.from([1]), output, witness, u32(lockTime)])
  return { unsignedHex: unsigned.toString('hex'), rawHex: raw.toString('hex'), prevout, output }
}

export function signedFixtureSpend({ plan, outpoint, branch = 'redeem', preimageHex = '01'.repeat(32), keyId = branch === 'redeem' ? 1 : 2, inputSats = 5_000_000_000n, amountSats, outputScriptHex, lockTime = branch === 'refund' ? plan.refundHeight : 0, sequence = 0xfffffffd } = {}) {
  const base = fixtureTransaction({ outpoint, amountSats, outputScriptHex, lockTime, sequence })
  const preimage = Buffer.concat([
    u32(2), sha256d(base.prevout), sha256d(u32(sequence)), base.prevout,
    vector(Buffer.from(plan.witnessScriptHex, 'hex')), u64(inputSats), u32(sequence),
    sha256d(base.output), u32(lockTime), u32(1),
  ])
  // OpenSSL hashes once; feeding SHA256(preimage) gives Bitcoin's SHA256d digest.
  const signature = Buffer.concat([lowS(sign('sha256', sha(preimage), fixtureKey(keyId).privateKey)), Buffer.from([1])]).toString('hex')
  const witnessHex = branch === 'redeem'
    ? [signature, preimageHex, '01', plan.witnessScriptHex]
    : [signature, '', plan.witnessScriptHex]
  return { ...fixtureTransaction({ outpoint, amountSats, outputScriptHex, lockTime, sequence, witnessHex }), witnessHex }
}

export function fixturePsbt({ plan, outpoint, branch = 'redeem', amountSats, outputScriptHex, witnessAmountSats = 5_000_000_000n, witnessScriptHex = plan.witnessScriptHex, sighash = 1, extraInputEntries = [], lockTime = branch === 'refund' ? plan.refundHeight : 0, sequence = 0xfffffffd } = {}) {
  const tx = fixtureTransaction({ outpoint, amountSats, outputScriptHex, lockTime, sequence })
  const entry = (key, value) => Buffer.concat([vector(key), vector(value)])
  return Buffer.concat([
    Buffer.from('70736274ff', 'hex'), entry(Buffer.from([0]), Buffer.from(tx.unsignedHex, 'hex')), Buffer.from([0]),
    entry(Buffer.from([1]), Buffer.concat([u64(witnessAmountSats), vector(Buffer.from(plan.scriptPubKeyHex, 'hex'))])),
    entry(Buffer.from([3]), u32(sighash)), entry(Buffer.from([5]), Buffer.from(witnessScriptHex, 'hex')),
    ...extraInputEntries.map(([key, value]) => entry(Buffer.from(key, 'hex'), Buffer.from(value, 'hex'))),
    Buffer.from([0, 0]),
  ]).toString('base64')
}

export function fixtureIntent(plan, outpoint, branch = 'redeem', overrides = {}) {
  return {
    schemaVersion: 1, network: 'regtest', programId: plan.programId, branch,
    outpoint, outputs: [{ scriptPubKeyHex: '0014' + '11'.repeat(20), valueSats: '4999990000' }],
    maxFeeSats: '100000', transactionVersion: 2,
    lockTime: branch === 'refund' ? plan.refundHeight : 0, sequence: 0xfffffffd, ...overrides,
  }
}

export function fixtureApproval(request, privateKey, { nonce = '01'.repeat(32), issuedAt = 1_000, expiresAt = 1_200, authorizerId = 'fixture-operator' } = {}) {
  const envelope = { version: 1, authorizerId, nonce, issuedAt, expiresAt, ...psbtReviewCommitments(request.psbtBase64, request.intent, request.program) }
  return { ...envelope, signatureHex: sign(null, psbtApprovalChallenge(envelope), privateKey).toString('hex') }
}
