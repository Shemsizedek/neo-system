// NEO-OMARCHY-004: independent-verifiable Ed25519 evidence receipt envelope.
// Signature is local, not a Crown Chain anchor or independent witness statement.
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'
const HEX64 = /^[a-f0-9]{64}$/i
const signerRe = /^neo:(?:auditor|operator):[a-z0-9][a-z0-9._-]{0,63}$/
const canonical = obj => Object.fromEntries(Object.keys(obj).sort().map(k => [k, obj[k]]))
const bytes = obj => Buffer.from(JSON.stringify(canonical(obj)))

export function signOmarchyEvidence({
  eventHash, previousHash, signerId, signerKeyId, privateKeyPem, signedAt = Date.now(),
} = {}) {
  if (!HEX64.test(eventHash || '') || !HEX64.test(previousHash || '') ||
      !signerRe.test(signerId || '') || !/^[A-Za-z0-9._:-]{1,96}$/.test(signerKeyId || '') ||
      !Number.isSafeInteger(signedAt)) throw new Error('receipt_fields_invalid')
  const key = createPrivateKey(privateKeyPem)
  if (key.asymmetricKeyType !== 'ed25519') throw new Error('ed25519_required')
  const payload = {
    schema: 'NEO-OMARCHY-RECEIPT-004', eventHash: eventHash.toLowerCase(),
    previousHash: previousHash.toLowerCase(), signerId, signerKeyId, signedAt,
  }
  return {
    payload, signature: sign(null, bytes(payload), key).toString('base64url'),
    blockchainAnchorVerified: false, independentlyWitnessed: false,
  }
}

export function verifyOmarchyEvidence({ receipt, trustedSignerId, trustedKeyId, publicKeyPem } = {}) {
  try {
    if (!receipt || receipt.blockchainAnchorVerified !== false ||
        receipt.independentlyWitnessed !== false ||
        typeof receipt.signature !== 'string' ||
        !/^[A-Za-z0-9_-]+$/.test(receipt.signature) ||
        !receipt.payload || typeof receipt.payload !== 'object' ||
        Object.keys(receipt.payload).sort().join(',') !==
          ['schema','eventHash','previousHash','signerId','signerKeyId','signedAt'].sort().join(',') ||
        receipt.payload.schema !== 'NEO-OMARCHY-RECEIPT-004' ||
        receipt.payload.signerId !== trustedSignerId ||
        receipt.payload.signerKeyId !== trustedKeyId ||
        !HEX64.test(receipt.payload.eventHash || '') ||
        !HEX64.test(receipt.payload.previousHash || '') ||
        !Number.isSafeInteger(receipt.payload.signedAt)) return false
    const key = createPublicKey(publicKeyPem)
    if (key.asymmetricKeyType !== 'ed25519') return false
    const sig = Buffer.from(receipt.signature, 'base64url')
    return sig.length === 64 && sig.toString('base64url') === receipt.signature &&
      verify(null, bytes(receipt.payload), key, sig)
  } catch { return false }
}
