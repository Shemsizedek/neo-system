import { createHash } from 'node:crypto'
import { evaluatePressReadiness } from './readiness.mjs'

// An operator-review packet, not a production activation switch. Explicit
// negative evidence overrides paper attestations. Real runtime checks require
// an independently operated audit and cannot be manufactured by code.
export function assessPressRuntimeCandidate({
  deploymentSha, attestations = [], trustedReviewers = {},
  observations = {}, now = () => Date.now()
} = {}) {
  const release = evaluatePressReadiness({
    deploymentSha, attestations, trustedReviewers, now
  })
  const required = Object.freeze({
    issuer: 'Noogle issuer, audience, active membership and revocation checked against the connected staging runtime',
    storage: 'Distinct encrypted database/media volumes plus recovery and KMS controls independently inspected',
    legacyVault: 'Legacy Evidence Vault data paths and network access confirmed physically isolated',
    independentWitness: 'Custody witness key and external retrieval verified out of band',
    privacy: 'Source confidentiality, access logging and correction disclosure independently reviewed',
    legal: 'Jurisdiction-specific legal clearance present'
  })
  const observationsAccepted = Object.entries(required).map(([id,requirement]) => {
    const item = observations[id]
    const hasSignedEvidence = item && item.checked === true &&
      typeof item.reference === 'string' && /^sha256:[a-f0-9]{64}$/.test(item.reference) &&
      typeof item.reviewedBy === 'string' && item.reviewedBy.length > 3
    return {id,requirement,evidenceReported:Boolean(hasSignedEvidence)}
  })
  const missing = observationsAccepted.filter(x=>!x.evidenceReported).map(x=>x.id)
  const status = release.status === 'REVIEW_READY' && !missing.length
    ? 'INDEPENDENT_APPROVAL_REQUIRED' : 'BLOCKED'
  const fingerprint = createHash('sha256').update(JSON.stringify({
    deploymentSha:deploymentSha||null,missing,
    releaseControls:release.missingControls,
    status
  })).digest('hex')
  return Object.freeze({
    status, verificationFingerprint:fingerprint,
    pressControls:release, runtimeChecks:observationsAccepted,
    missingRuntimeEvidence:missing,
    productionAuthorized:false, productionDeployed:false,
    originalCredentialVerified:false, mediaPublished:false,
    limitations:'Records submitted by the operator are not independent verification; manual evidence inspection and explicit external approval remain mandatory.'
  })
}
