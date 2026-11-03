import { createHash } from 'node:crypto'

export const CREDENTIAL_STATES = Object.freeze([
  'USER_PROVIDED_UNVERIFIED', 'HISTORICAL_ISSUER_VERIFIED',
  'CURRENT_STATUS_VERIFIED', 'DISPUTED', 'REVOKED'
])
export const SOURCE_TIERS = Object.freeze(['PRIMARY', 'AUTHORITATIVE', 'SECONDARY', 'LEAD'])
export const EDITORIAL_STATES = Object.freeze(['ALLEGED', 'CORROBORATED', 'CONTRADICTED', 'UNRESOLVED'])

const isIso = value => typeof value === 'string' && !Number.isNaN(Date.parse(value)) && /^\d{4}-\d\d-\d\dT/.test(value) && value.endsWith('Z')
const isSha256 = value => typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value)
const isHttpsUrl = value => typeof value === 'string' && /^https:\/\//i.test(value)
const isNonblank = value => typeof value === 'string' && value.trim().length > 0

export function sha256(bytes) {
  if (!(bytes instanceof Uint8Array) && typeof bytes !== 'string') throw new TypeError('expected string or Uint8Array')
  return createHash('sha256').update(bytes).digest('hex')
}

// A metadata manifest only: no credential upload, vault storage, investigation,
// factual authentication, identity assertion or publication side effect.
export function validateEvidenceMetadata(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return ['record must be an object']
  const errors = []
  for (const field of ['id', 'caseId', 'title', 'custodianId', 'sourceLocator']) {
    if (!isNonblank(record[field])) errors.push(field + ' is required')
  }
  for (const field of ['acquiredAt', 'observedAt']) if (!isIso(record[field])) errors.push(field + ' must be UTC ISO-8601')
  if (!isSha256(record.sha256)) errors.push('sha256 must be a 64-character hex digest')
  if (!SOURCE_TIERS.includes(record.sourceTier)) errors.push('invalid sourceTier')
  if (!EDITORIAL_STATES.includes(record.editorialState)) errors.push('invalid editorialState')
  if (!['PUBLIC', 'RESTRICTED'].includes(record.accessLevel)) errors.push('invalid accessLevel')
  if (record.sourceUrl !== undefined && !isHttpsUrl(record.sourceUrl)) errors.push('sourceUrl must be HTTPS')
  if (record.sourceKind === 'SOCIAL_MEDIA' && record.sourceTier !== 'LEAD' && !isNonblank(record.corroborationNote)) {
    errors.push('social media requires corroboration to advance beyond lead')
  }
  return errors
}
export function makeEvidenceMetadata(record, originalBytes) {
  const errors = validateEvidenceMetadata(record)
  if (errors.length) throw new Error('invalid metadata: ' + errors.join('; '))
  if (originalBytes !== undefined && sha256(originalBytes) !== record.sha256.toLowerCase()) throw new Error('evidence hash mismatch')
  return Object.freeze({
    ...record,
    sha256: record.sha256.toLowerCase(),
    custodyEvents: Object.freeze([{
      event: 'INTAKE_REGISTERED', at: record.acquiredAt, actorId: record.custodianId, digest: record.sha256.toLowerCase()
    }])
  })
}
export function publicEvidencePreview(record, review) {
  if (validateEvidenceMetadata(record).length) throw new Error('invalid evidence metadata')
  if (record.accessLevel !== 'PUBLIC') throw new Error('restricted evidence cannot be published')
  if (!review || review.decision !== 'APPROVED' || !isNonblank(review.editorId)
    || review.privacyChecked !== true || review.legalRiskChecked !== true
    || review.accuracyChecked !== true) throw new Error('editorial release approval is required')
  // Strict allowlist to avoid source identities, custody, source notes or raw media.
  return Object.freeze({
    id: record.id, caseId: record.caseId, title: record.title, sourceTier: record.sourceTier,
    editorialState: record.editorialState, observedAt: record.observedAt,
    sourceUrl: record.sourceUrl && isHttpsUrl(record.sourceUrl) ? record.sourceUrl : null
  })
}
export function credentialPublicSummary(record) {
  if (!record || !CREDENTIAL_STATES.includes(record.state)) throw new Error('invalid credential state')
  return Object.freeze({
    state: record.state, currentlyVerified: record.state === 'CURRENT_STATUS_VERIFIED',
    grantsSpecialGovernmentAuthority: false
  })
}
