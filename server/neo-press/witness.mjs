import { verify as verifySignature, createHash } from 'node:crypto'

const sha = bytes => createHash('sha256').update(bytes).digest('hex')
const validHash = s => typeof s === 'string' && /^[a-f0-9]{64}$/.test(s)
const encode = record => Buffer.from(JSON.stringify([
  'NEO-PRESS-WITNESS-V1',record.witnessId,record.publicationId,record.checkpointSha256,
  record.logRootSha256,record.publishedAt
]))

// Confirms that a separately configured witness can re-serve a signed receipt.
// This does NOT prove public immutability, a legally recognized timestamp,
// or a blockchain anchor. No witness connector is configured by this module.
export async function verifyIndependentPressWitness({
  checkpoint, witnessRecord, witness, trustedWitnessKeys, newsroomSignerId,
  now = () => Date.now()
} = {}) {
  const blocked = reason => Object.freeze({
    verified:false, independentWitnessVerified:false, externallyAnchored:false, reason
  })
  if (!checkpoint || !witnessRecord || !witness ||
    typeof witness.getRecord !== 'function' || !trustedWitnessKeys) return blocked('witness_unconfigured')
  const id = witnessRecord.witnessId
  const trusted = trustedWitnessKeys[id]
  if (!trusted || trusted.independent !== true || id === newsroomSignerId ||
    !trusted.publicKey || !/^[A-Za-z0-9_-]{6,120}$/.test(witnessRecord.publicationId || '') ||
    !validHash(witnessRecord.checkpointSha256) || !validHash(witnessRecord.logRootSha256) ||
    !validHash(checkpoint.receiptSha256) ||
    witnessRecord.checkpointSha256 !== checkpoint.receiptSha256 ||
    !Number.isFinite(Date.parse(witnessRecord.publishedAt)) ||
    Date.parse(witnessRecord.publishedAt) > Number(now()) + 30_000) return blocked('invalid_witness_identity_or_record')
  let signed = false
  try {
    const bytes = Buffer.from(witnessRecord.signature || '', 'base64url')
    signed = bytes.length === 64 && verifySignature(null,encode(witnessRecord),trusted.publicKey,bytes)
  } catch {}
  if (!signed) return blocked('invalid_witness_signature')
  let fetched
  try { fetched = await witness.getRecord(witnessRecord.publicationId) }
  catch { return blocked('independent_retrieval_unavailable') }
  if (!fetched || fetched.witnessId !== id ||
    fetched.publicationId !== witnessRecord.publicationId ||
    fetched.checkpointSha256 !== witnessRecord.checkpointSha256 ||
    fetched.logRootSha256 !== witnessRecord.logRootSha256 ||
    fetched.signature !== witnessRecord.signature ||
    fetched.publishedAt !== witnessRecord.publishedAt) return blocked('retrieved_witness_mismatch')
  return Object.freeze({
    verified:true, independentWitnessVerified:true, externallyAnchored:false,
    receiptSha256:checkpoint.receiptSha256, witnessId:id,
    publicationId:witnessRecord.publicationId,
    limitation:'Signed independently retrievable witness acknowledgment, not verified immutable/public anchoring.'
  })
}
export const pressWitnessTestPayload = encode
export const pressWitnessHash = sha
