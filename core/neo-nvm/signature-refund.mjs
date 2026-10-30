import { ECDH } from 'node:crypto'
import { decodeHex, requireFields, requireRegtest, VmInputError } from '../neo-bvm/input.mjs'
import { sha256Hex } from '../neo-bvm/runtime.mjs'

function publicKey(hex) {
  const key = decodeHex(hex, 33)
  if (key.length !== 33 || ![2, 3].includes(key[0])) throw new VmInputError('NVM_COMPRESSED_PUBLIC_KEY_REQUIRED')
  try { ECDH.convertKey(key, 'secp256k1', undefined, undefined, 'compressed') }
  catch { throw new VmInputError('NVM_PUBLIC_KEY_INVALID') }
  return key.toString('hex')
}

function heightPush(height) {
  if (height <= 16) return Buffer.from([0x50 + height]).toString('hex')
  const bytes = []
  for (let n = height; n; n >>>= 8) bytes.push(n & 255)
  if (bytes.at(-1) & 128) bytes.push(0)
  return Buffer.from([bytes.length, ...bytes]).toString('hex')
}

/** Public-key-only compiler. Signature/timelock execution is delegated to Core. */
export function compileSignatureRefund(program) {
  requireFields(program, ['schemaVersion', 'family', 'network', 'kind', 'digestHex', 'redeemPublicKeyHex', 'refundPublicKeyHex', 'refundHeight'])
  if (program.schemaVersion !== 1 || program.family !== 'bitcoin' || program.kind !== 'sha256-signature-refund-v1') {
    throw new VmInputError('NVM_SIGNATURE_REFUND_PROFILE_REQUIRED')
  }
  requireRegtest(program.network)
  const digest = decodeHex(program.digestHex, 32)
  if (digest.length !== 32) throw new VmInputError('DIGEST_SIZE')
  const redeemPublicKeyHex = publicKey(program.redeemPublicKeyHex)
  const refundPublicKeyHex = publicKey(program.refundPublicKeyHex)
  if (redeemPublicKeyHex === refundPublicKeyHex) throw new VmInputError('NVM_DISTINCT_BRANCH_KEYS_REQUIRED')
  if (!Number.isSafeInteger(program.refundHeight) || program.refundHeight < 1 || program.refundHeight >= 500_000_000) {
    throw new VmInputError('NVM_BLOCK_HEIGHT_REQUIRED')
  }
  // IF SIZE 32 EQUALVERIFY SHA256 digest EQUALVERIFY redeemKey CHECKSIG
  // ELSE height CHECKLOCKTIMEVERIFY DROP refundKey CHECKSIG ENDIF
  const witnessScriptHex = `6382012088a820${digest.toString('hex')}8821${redeemPublicKeyHex}ac67${heightPush(program.refundHeight)}b17521${refundPublicKeyHex}ac68`
  const programId = sha256Hex(Buffer.from(witnessScriptHex, 'hex'))
  return Object.freeze({
    schemaVersion: 1, family: 'bitcoin', network: 'regtest', kind: program.kind,
    digestHex: digest.toString('hex'), redeemPublicKeyHex, refundPublicKeyHex,
    refundHeight: program.refundHeight, witnessScriptHex, scriptPubKeyHex: `0020${programId}`, programId,
    executionAuthority: 'Bitcoin Core', localSubsetSupported: false,
  })
}
