import type { NomniDigitalTitle } from './nomniDigitalTitleRegistry'
import type { NomniTitleConflictGateResult } from './nomniTitleConflictGate'
import type { NomniEncumbranceGateResult } from './nomniEncumbranceRightsGate'
import type { NomniTitleCertificate } from './nomniTitleCertificationGate'
import { certifyNomniTitle } from './nomniTitleCertificationGate'

export type NomniCertificateVerificationStatus =
  | 'VALID'
  | 'STALE'
  | 'REVOKED'
  | 'SUPERSEDED'
  | 'INVALID'
  | 'REVIEW'

export type NomniCertificateRevocationReason =
  | 'TITLE_STATE_CHANGED'
  | 'OWNER_CHANGED'
  | 'NEW_ENCUMBRANCE'
  | 'TITLE_CONFLICT_DISCOVERED'
  | 'CERTIFICATE_HASH_MISMATCH'
  | 'SOURCE_OR_INSTRUMENT_CHANGED'
  | 'MANUAL_PROVENANCE_CORRECTION'
  | 'SUPERSEDED_BY_NEW_CERTIFICATE'
  | 'OTHER'

export type NomniCertificateRevocationRecord = {
  id: string
  certificateId: string
  status: 'REVOKED' | 'SUPERSEDED'
  reason: NomniCertificateRevocationReason
  explanation: string
  effectiveAt: string
  supersededByCertificateId?: string
  evidenceRefs: string[]
}

export type NomniCertificateVerificationResult = {
  status: NomniCertificateVerificationStatus
  certificateId: string
  validAgainstCurrentState: boolean
  cryptographicallyConsistent: boolean
  currentCertificateId?: string
  reasons: string[]
  revocation?: NomniCertificateRevocationRecord
}

function stableUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function arraysEqual(a: string[], b: string[]): boolean {
  const left = stableUnique(a)
  const right = stableUnique(b)
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export async function verifyNomniCertificateAgainstCurrentState(input: {
  certificate: NomniTitleCertificate
  title: NomniDigitalTitle
  conflictGate: NomniTitleConflictGateResult
  encumbranceGate: NomniEncumbranceGateResult
  revocations?: NomniCertificateRevocationRecord[]
}): Promise<NomniCertificateVerificationResult> {
  const reasons: string[] = []
  const existingRevocation = (input.revocations ?? []).find(record => record.certificateId === input.certificate.certificateId)

  if (existingRevocation) {
    return {
      status: existingRevocation.status,
      certificateId: input.certificate.certificateId,
      validAgainstCurrentState: false,
      cryptographicallyConsistent: input.certificate.certificateId === `NOMNI-SHA256-${input.certificate.sha256}`,
      currentCertificateId: existingRevocation.supersededByCertificateId,
      reasons: [existingRevocation.explanation],
      revocation: existingRevocation
    }
  }

  const recomputed = await certifyNomniTitle({
    title: input.title,
    conflictGate: input.conflictGate,
    encumbranceGate: input.encumbranceGate,
    issuedAt: input.certificate.issuedAt
  })

  if (recomputed.status === 'DENIED') {
    return {
      status: 'STALE',
      certificateId: input.certificate.certificateId,
      validAgainstCurrentState: false,
      cryptographicallyConsistent: input.certificate.certificateId === `NOMNI-SHA256-${input.certificate.sha256}`,
      reasons: stableUnique([
        'Current state no longer satisfies title-certification prerequisites.',
        ...recomputed.reasons
      ])
    }
  }

  const cryptographicallyConsistent =
    input.certificate.sha256 === recomputed.sha256 &&
    input.certificate.canonicalPayload === recomputed.canonicalPayload &&
    input.certificate.certificateId === recomputed.certificateId

  if (!cryptographicallyConsistent) reasons.push('Certificate hash or canonical payload does not reconcile with the reconstructed current state.')
  if (input.certificate.ownerAddress !== recomputed.ownerAddress) reasons.push(`Certificate owner ${input.certificate.ownerAddress} does not match current verified owner ${recomputed.ownerAddress}.`)
  if (!arraysEqual(input.certificate.titleTransactionHashes, recomputed.titleTransactionHashes)) reasons.push('Verified title transaction set changed after certificate issuance.')
  if (!arraysEqual(input.certificate.titleInstrumentIds, recomputed.titleInstrumentIds)) reasons.push('Title instrument set changed after certificate issuance.')
  if (!arraysEqual(input.certificate.activeInterestIds, recomputed.activeInterestIds)) reasons.push('Active rights or encumbrance set changed after certificate issuance.')
  if (!arraysEqual(input.certificate.releasedInterestIds, recomputed.releasedInterestIds)) reasons.push('Released-interest history changed after certificate issuance.')
  if (!arraysEqual(input.certificate.sourceUrls, recomputed.sourceUrls)) reasons.push('Certificate source-provenance set changed after certificate issuance.')

  const isCurrent = reasons.length === 0
  return {
    status: isCurrent ? 'VALID' : 'STALE',
    certificateId: input.certificate.certificateId,
    validAgainstCurrentState: isCurrent,
    cryptographicallyConsistent,
    currentCertificateId: recomputed.certificateId,
    reasons: isCurrent ? ['Certificate independently reconciles with the current certifiable NOMNI state.'] : stableUnique(reasons)
  }
}

export function revokeNomniCertificate(input: {
  certificate: NomniTitleCertificate
  reason: NomniCertificateRevocationReason
  explanation: string
  effectiveAt?: string
  evidenceRefs?: string[]
  supersededByCertificateId?: string
}): NomniCertificateRevocationRecord {
  const status: NomniCertificateRevocationRecord['status'] = input.supersededByCertificateId ? 'SUPERSEDED' : 'REVOKED'
  return {
    id: `NOMNI-CERT-${status}-${input.certificate.certificateId.replace('NOMNI-SHA256-', '').slice(0, 16)}`,
    certificateId: input.certificate.certificateId,
    status,
    reason: input.supersededByCertificateId ? 'SUPERSEDED_BY_NEW_CERTIFICATE' : input.reason,
    explanation: input.explanation,
    effectiveAt: input.effectiveAt ?? new Date().toISOString(),
    supersededByCertificateId: input.supersededByCertificateId,
    evidenceRefs: stableUnique(input.evidenceRefs ?? [])
  }
}

export function supersedeNomniCertificate(input: {
  priorCertificate: NomniTitleCertificate
  replacementCertificate: NomniTitleCertificate
  explanation?: string
  effectiveAt?: string
  evidenceRefs?: string[]
}): NomniCertificateRevocationRecord {
  return revokeNomniCertificate({
    certificate: input.priorCertificate,
    reason: 'SUPERSEDED_BY_NEW_CERTIFICATE',
    explanation: input.explanation ?? `Superseded by ${input.replacementCertificate.certificateId} after a certifiable NOMNI state transition.`,
    effectiveAt: input.effectiveAt,
    evidenceRefs: input.evidenceRefs,
    supersededByCertificateId: input.replacementCertificate.certificateId
  })
}

export function validateNomniRevocationLedger(records: NomniCertificateRevocationRecord[]): string[] {
  const issues: string[] = []
  const byCertificate = new Map<string, NomniCertificateRevocationRecord[]>()

  for (const record of records) {
    const bucket = byCertificate.get(record.certificateId) ?? []
    bucket.push(record)
    byCertificate.set(record.certificateId, bucket)

    if (record.status === 'SUPERSEDED' && !record.supersededByCertificateId) {
      issues.push(`${record.id} is SUPERSEDED but has no replacement certificate reference.`)
    }
    if (record.status === 'REVOKED' && record.supersededByCertificateId) {
      issues.push(`${record.id} is REVOKED but also specifies a superseding certificate.`)
    }
    if (!record.explanation.trim()) issues.push(`${record.id} has no revocation explanation.`)
  }

  for (const [certificateId, bucket] of byCertificate) {
    const terminalStates = new Set(bucket.map(record => `${record.status}|${record.supersededByCertificateId ?? ''}|${record.reason}`))
    if (terminalStates.size > 1) issues.push(`${certificateId} has conflicting revocation/supersession records.`)
  }

  return stableUnique(issues)
}

export const nomniCertificateVerificationRevocationGateV1 = {
  id: 'NEO-NOMNI-CERTIFICATE-VERIFICATION-REVOCATION-GATE',
  version: '1.0.0',
  purpose: 'Independently revalidate issued NOMNI title certificates against reconstructed current state and preserve explicit revocation or supersession history when the certified state changes.',
  principles: [
    'Certificate validity is state-dependent and must be independently recomputable from current verified evidence.',
    'A previously valid certificate becomes stale when title, owner, instruments, rights, encumbrances, conflicts, or provenance materially change.',
    'Revocation and supersession are append-only audit events; prior certificates are not silently erased.',
    'A replacement certificate must itself pass the Title Certification Gate before it can supersede an earlier certificate.',
    'Cryptographic consistency does not override a later substantive title or rights defect.',
    'NEO certificate status is a provenance determination, not a court judgment or universal legal determination.'
  ],
  verifyNomniCertificateAgainstCurrentState,
  revokeNomniCertificate,
  supersedeNomniCertificate,
  validateNomniRevocationLedger
} as const
