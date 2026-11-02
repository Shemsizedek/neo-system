import { createHash, verify as verifySignature } from 'node:crypto'

// Verifies signed attestations for release-evidence review; it does not
// independently inspect infrastructure or authorize deployment.
export const REQUIRED_PRESS_CONTROLS = Object.freeze([
  'STACKED_PRS_REVIEWED',
  'PRESS_SPECIFIC_CI',
  'LEGACY_VAULT_ISOLATION',
  'ENCRYPTED_STORAGE_AT_REST',
  'KMS_KEY_ROTATION_DRILL',
  'PRIVATE_BACKUP_RESTORE_DRILL',
  'NEOPASS_SCOPED_ISSUER',
  'PRESS_ROLE_REGISTRY',
  'INDEPENDENT_CUSTODY_WITNESS',
  'SECURITY_THREAT_REVIEW',
  'JURISDICTION_COUNSEL_REVIEW'
])
const sha = x => createHash('sha256').update(x).digest('hex')
const canonical = x => Buffer.from(JSON.stringify([
  'NEO-PRESS-004-EVIDENCE-V1',
  x.controlId,x.deploymentSha,x.evidenceSha256,x.reviewerId,x.checkedAt,x.expiresAt,x.outcome
]))
const hex = x => typeof x === 'string' && /^[a-f0-9]{64}$/.test(x)
const iso = x => typeof x === 'string' && /^\d{4}-\d\d-\d\dT/.test(x) &&
  x.endsWith('Z') && Number.isFinite(Date.parse(x))

export function verifyPressAttestation({attestation, trustedReviewers, deploymentSha, now = () => Date.now()} = {}) {
  if (!attestation || !trustedReviewers || !hex(deploymentSha) ||
    !REQUIRED_PRESS_CONTROLS.includes(attestation.controlId) ||
    attestation.deploymentSha !== deploymentSha || !hex(attestation.evidenceSha256) ||
    !iso(attestation.checkedAt) || !iso(attestation.expiresAt) ||
    attestation.outcome !== 'PASS' || !attestation.reviewerId ||
    !/^[A-Za-z0-9_-]+$/.test(attestation.signature || '')) return false
  const key = trustedReviewers[attestation.reviewerId]
  if (!key || !key.publicKey || key.independent !== true) return false
  const t = now()
  const current = typeof t === 'number' ? t : Date.parse(t)
  if (!Number.isFinite(current) || Date.parse(attestation.checkedAt) > current + 30_000 ||
    Date.parse(attestation.expiresAt) <= current ||
    Date.parse(attestation.expiresAt) - Date.parse(attestation.checkedAt) > 30 * 86400_000) return false
  try {
    const signature = Buffer.from(attestation.signature,'base64url')
    return signature.length === 64 &&
      verifySignature(null,canonical(attestation),key.publicKey,signature)
  } catch {return false}
}

// A GO decision is deliberately absent: successful validations do NOT
// represent access to the real runtime or permission to deploy.
export function evaluatePressReadiness({
  attestations = [], trustedReviewers = {}, deploymentSha, now = () => Date.now()
} = {}) {
  const accepted = attestations.filter(a => verifyPressAttestation({
    attestation:a,trustedReviewers,deploymentSha,now
  }))
  const controls = REQUIRED_PRESS_CONTROLS.map(id => ({
    controlId:id, verifiedSignedStatements:accepted.filter(a=>a.controlId===id).length,
    evidencePresent:accepted.some(a=>a.controlId===id)
  }))
  const reviewers = new Set(accepted.map(a=>a.reviewerId))
  const missing = controls.filter(x=>!x.evidencePresent).map(x=>x.controlId)
  return Object.freeze({
    status: missing.length === 0 && reviewers.size >= 2 ? 'REVIEW_READY' : 'BLOCKED',
    deploymentApproved:false, deployExecuted:false, publicationApproved:false,
    checks:controls, missingControls:missing,
    multipleIndependentReviewers:reviewers.size>=2,
    verifiedAttestationCount:accepted.length,
    assertionAssurance:'SIGNATURE_AND_CURRENCY_ONLY',
    limitations:'Signed attestations are not independent infrastructure inspection, backup proof, legal advice or authorization.'
  })
}
export const pressAttestationTestSigningPayload = attestation => canonical(attestation)
export const pressEvidenceDigest = value => sha(Buffer.isBuffer(value) ? value : JSON.stringify(value))
