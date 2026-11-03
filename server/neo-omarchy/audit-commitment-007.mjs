// NEO-OMARCHY-007 — signed snapshot commitment over non-secret audit metadata.
// The historical Gate 004 audit event hash is not recomputed here because
// metadata_json is JSONB and does not preserve the source serialization order.
// This is a structural linkage check + signed snapshot, NOT proof of origin,
// independent witness, trusted clock or Crown Chain anchoring.
import { createHash, createPrivateKey, createPublicKey, sign, verify } from 'node:crypto'

const SHA = /^[a-f0-9]{64}$/i
const WITNESS = /^neo:(?:operator|auditor):[a-z0-9][a-z0-9._-]{0,63}$/
const bytes = value => Buffer.from(JSON.stringify(value))
const sha = value => createHash('sha256').update(value).digest('hex')

export async function createStagingAuditCommitment({
  pool, signingKeyPem, signerId, signerKeyId, now = () => Date.now(),
} = {}) {
  if (!pool || typeof pool.query !== 'function' ||
      !WITNESS.test(signerId || '') || !/^[A-Za-z0-9._:-]{1,96}$/.test(signerKeyId || '')) {
    throw new Error('staging_evidence_dependencies_required')
  }
  const privateKey = createPrivateKey(signingKeyPem)
  if (privateKey.asymmetricKeyType !== 'ed25519') throw new Error('ed25519_signing_key_required')
  const { rows } = await pool.query(
    'SELECT seq,kind,subject_id,metadata_json,previous_hash,event_hash FROM neo_omarchy.audit_events ORDER BY seq ASC',
  )
  if (!Array.isArray(rows) || !rows.length || rows.length > 5000) {
    throw new Error('unbounded_or_empty_audit_snapshot')
  }
  let previousHash = '0'.repeat(64)
  const snapshot = []
  for (let i = 0; i < rows.length; i++) {
    const item = rows[i]
    if (Number(item.seq) !== i + 1 || !SHA.test(item.event_hash || '') ||
        item.previous_hash !== previousHash ||
        typeof item.kind !== 'string' ||
        typeof item.subject_id !== 'string' ||
        !item.metadata_json || typeof item.metadata_json !== 'object' ||
        Array.isArray(item.metadata_json)) throw new Error('audit_linkage_invalid')
    previousHash = item.event_hash
    snapshot.push({
      seq: Number(item.seq), kind: item.kind, subjectId: item.subject_id,
      metadata: item.metadata_json, previousHash: item.previous_hash, eventHash: item.event_hash,
    })
  }
  const time = now()
  if (!Number.isSafeInteger(time) || time <= 0) throw new Error('invalid_clock')
  const payload = {
    schema: 'NEO-OMARCHY-AUDIT-COMMITMENT-007',
    gate: 'NEO-OMARCHY-007',
    signerId, signerKeyId, signedAt: time,
    eventCount: snapshot.length,
    headEventHash: previousHash,
    snapshotSha256: sha(bytes(snapshot)),
    sourceEventHashesRecomputed: false,
    independentlyWitnessed: false,
    blockchainAnchorVerified: false,
    productionReady: false,
  }
  return {
    payload,
    signature: sign(null, bytes(payload), privateKey).toString('base64url'),
    // Do not export confidential audit subjects, secrets or task objectives.
  }
}

export function verifyStagingAuditCommitment({ commitment, publicKeyPem, signerId, signerKeyId } = {}) {
  try {
    const p = commitment?.payload
    if (!p || p.schema !== 'NEO-OMARCHY-AUDIT-COMMITMENT-007' ||
        p.signerId !== signerId || p.signerKeyId !== signerKeyId ||
        !Number.isInteger(p.eventCount) || p.eventCount < 1 ||
        !Number.isSafeInteger(p.signedAt) ||
        !SHA.test(p.headEventHash || '') || !SHA.test(p.snapshotSha256 || '') ||
        p.sourceEventHashesRecomputed !== false ||
        p.independentlyWitnessed !== false ||
        p.blockchainAnchorVerified !== false ||
        p.productionReady !== false ||
        typeof commitment.signature !== 'string' ||
        !/^[A-Za-z0-9_-]+$/.test(commitment.signature)) return false
    const key = createPublicKey(publicKeyPem)
    if (key.asymmetricKeyType !== 'ed25519') return false
    const signature = Buffer.from(commitment.signature, 'base64url')
    return signature.length === 64 &&
      signature.toString('base64url') === commitment.signature &&
      verify(null, bytes(p), key, signature)
  } catch { return false }
}
