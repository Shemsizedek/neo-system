import { createHash, sign as nodeSign, verify as nodeVerify } from 'node:crypto'

const digest = value => createHash('sha256').update(value).digest('hex')
const toPayload = (caseId, integrity, issuedAt, signerId) => ({
  protocol: 'NEO-PRESS-CUSTODY-CHECKPOINT-V1',
  caseId, count: integrity.count, head: integrity.head,
  issuedAt, signerId
})
const encode = x => Buffer.from(JSON.stringify(x), 'utf8')
function validReceiptShape(receipt) {
  return receipt && receipt.payload?.protocol === 'NEO-PRESS-CUSTODY-CHECKPOINT-V1' &&
    typeof receipt.payload.caseId === 'string' &&
    Number.isSafeInteger(receipt.payload.count) && receipt.payload.count > 0 &&
    /^[a-f0-9]{64}$/.test(receipt.payload.head) &&
    typeof receipt.payload.signerId === 'string' && receipt.payload.signerId.length > 0 &&
    typeof receipt.payload.issuedAt === 'string' &&
    Number.isFinite(Date.parse(receipt.payload.issuedAt)) &&
    /^[A-Za-z0-9_-]+$/.test(receipt.signature || '')
}

// Produces a detached checkpoint candidate. The private signing key should
// live outside the evidence service (e.g. a separately operated signer/HSM).
// A locally signed receipt is not independently published or externally anchored.
export async function createSignedCheckpoint({custodyStore, caseId, signer, signerId, now = () => new Date()} = {}) {
  if (!custodyStore?.verifyCase || !signer || typeof signer.sign !== 'function' ||
      typeof signerId !== 'string' || !/^[a-zA-Z0-9:_-]{4,100}$/.test(signerId)) {
    throw new Error('independent_signer_configuration_required')
  }
  const integrity = custodyStore.verifyCase(caseId)
  if (!integrity.valid || integrity.count < 1 || !/^[a-f0-9]{64}$/.test(integrity.head)) {
    throw new Error('custody_integrity_not_verifiable')
  }
  const payload = toPayload(caseId, integrity, now().toISOString(), signerId)
  const message = encode(payload)
  const signature = await signer.sign(message)
  if (!Buffer.isBuffer(signature) || signature.length !== 64) throw new Error('invalid_ed25519_signature')
  return Object.freeze({
    payload, signature: signature.toString('base64url'),
    receiptSha256: digest(Buffer.concat([message, signature])),
    externallyAnchored: false, published: false
  })
}
export function verifySignedCheckpoint({receipt, trustedPublicKey, custodyStore} = {}) {
  if (!validReceiptShape(receipt) || !trustedPublicKey || !custodyStore?.verifyCase) {
    return { signatureVerified: false, matchesCurrentCustody: false, externallyAnchored: false }
  }
  let signatureVerified = false
  try {
    const signature = Buffer.from(receipt.signature, 'base64url')
    signatureVerified = signature.length === 64 &&
      nodeVerify(null, encode(receipt.payload), trustedPublicKey, signature) &&
      digest(Buffer.concat([encode(receipt.payload), signature])) === receipt.receiptSha256
  } catch {}
  const current = custodyStore.verifyCase(receipt.payload.caseId)
  const matchesCurrentCustody = signatureVerified && current.valid &&
    current.count === receipt.payload.count && current.head === receipt.payload.head
  return { signatureVerified, matchesCurrentCustody, externallyAnchored: false }
}
export function localTestEd25519Signer(privateKey) {
  // For automated tests only. Production signer must not expose private key to this service.
  return Object.freeze({ sign: async data => nodeSign(null, data, privateKey) })
}
