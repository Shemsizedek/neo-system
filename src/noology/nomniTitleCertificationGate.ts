import type { NomniDigitalTitle } from './nomniDigitalTitleRegistry'
import type { NomniTitleConflictGateResult } from './nomniTitleConflictGate'
import type { NomniEncumbranceGateResult } from './nomniEncumbranceRightsGate'

export type NomniTitleCertificationStatus = 'ISSUED' | 'DENIED'

export type NomniTitleCertificate = {
  schema: 'NEO-NOMNI-TITLE-CERTIFICATE/V1'
  certificateId: string
  status: 'ISSUED'
  certificationClass: 'UNENCUMBERED_DIGITAL_TITLE'
  asset: 'NOMNI'
  issuerAddress: string
  ownerAddress: string
  supply: number
  divisible: false
  locked: true
  gateSnapshot: {
    title: 'VERIFIED_TITLE'
    conflict: 'CLEAN'
    encumbrance: 'UNENCUMBERED'
  }
  titleInstrumentIds: string[]
  titleTransactionHashes: string[]
  activeInterestIds: string[]
  releasedInterestIds: string[]
  sourceUrls: string[]
  canonicalPayload: string
  sha256: string
  issuedAt: string
  disclaimer: string
}

export type NomniTitleCertificationDenial = {
  schema: 'NEO-NOMNI-TITLE-CERTIFICATE/V1'
  status: 'DENIED'
  asset: 'NOMNI'
  reasons: string[]
  gateSnapshot: {
    title: NomniDigitalTitle['status']
    conflict: NomniTitleConflictGateResult['status']
    encumbrance: NomniEncumbranceGateResult['status']
  }
}

export type NomniTitleCertificationResult = NomniTitleCertificate | NomniTitleCertificationDenial

function stableUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToHex(digest)
}

function denialReasons(input: {
  title: NomniDigitalTitle
  conflictGate: NomniTitleConflictGateResult
  encumbranceGate: NomniEncumbranceGateResult
}): string[] {
  const reasons: string[] = []

  if (input.title.status !== 'VERIFIED_TITLE') reasons.push(`Digital title registry status is ${input.title.status}, not VERIFIED_TITLE.`)
  if (!input.title.verifiedOwnerAddress) reasons.push('No verified owner address is established by the digital title registry.')
  if (input.conflictGate.status !== 'CLEAN') reasons.push(`Title Conflict Gate status is ${input.conflictGate.status}, not CLEAN.`)
  if (!input.conflictGate.cleanTitleEligible) reasons.push('Title Conflict Gate does not mark the chain as clean-title eligible.')
  if (input.encumbranceGate.status !== 'UNENCUMBERED') reasons.push(`Encumbrance & Rights Gate status is ${input.encumbranceGate.status}, not UNENCUMBERED.`)
  if (!input.encumbranceGate.unencumberedTitleEligible) reasons.push('Encumbrance & Rights Gate does not mark the title as unencumbered-title eligible.')

  for (const conflict of input.conflictGate.conflicts) {
    reasons.push(`Title conflict ${conflict.id}: ${conflict.message}`)
  }
  for (const interest of input.encumbranceGate.blockingInterests) {
    reasons.push(`Blocking interest ${interest.id}: ${interest.scope}`)
  }
  for (const warning of input.encumbranceGate.warnings) reasons.push(`Encumbrance warning: ${warning}`)
  for (const unresolved of input.title.unresolved) reasons.push(`Unresolved title issue: ${unresolved}`)

  return stableUnique(reasons)
}

function canonicalCertificatePayload(input: {
  title: NomniDigitalTitle
  conflictGate: NomniTitleConflictGateResult
  encumbranceGate: NomniEncumbranceGateResult
}): string {
  const sourceUrls = stableUnique([
    ...input.title.instruments.flatMap(instrument => instrument.sourceUrls),
    ...input.encumbranceGate.activeInterests.flatMap(interest => interest.sourceUrls),
    ...input.encumbranceGate.releasedInterests.flatMap(interest => interest.sourceUrls)
  ])

  const payload = {
    schema: 'NEO-NOMNI-TITLE-CERTIFICATE/V1',
    certificationClass: 'UNENCUMBERED_DIGITAL_TITLE',
    asset: 'NOMNI',
    issuerAddress: input.title.issuerAddress,
    ownerAddress: input.title.verifiedOwnerAddress,
    supply: input.title.supply,
    divisible: input.title.divisible,
    locked: input.title.locked,
    gateSnapshot: {
      title: input.title.status,
      conflict: input.conflictGate.status,
      encumbrance: input.encumbranceGate.status
    },
    titleInstruments: input.title.instruments
      .map(instrument => ({
        eventId: instrument.eventId,
        txHash: instrument.txHash,
        blockIndex: instrument.blockIndex ?? null,
        blockTime: instrument.blockTime ?? null,
        grantor: instrument.grantor ?? null,
        grantee: instrument.grantee ?? null
      }))
      .sort((a, b) => (a.blockIndex ?? Number.MAX_SAFE_INTEGER) - (b.blockIndex ?? Number.MAX_SAFE_INTEGER) || a.eventId.localeCompare(b.eventId)),
    activeInterestIds: stableUnique(input.encumbranceGate.activeInterests.map(interest => interest.id)),
    releasedInterestIds: stableUnique(input.encumbranceGate.releasedInterests.map(interest => interest.id)),
    sourceUrls
  }

  return JSON.stringify(payload)
}

export async function certifyNomniTitle(input: {
  title: NomniDigitalTitle
  conflictGate: NomniTitleConflictGateResult
  encumbranceGate: NomniEncumbranceGateResult
  issuedAt?: string
}): Promise<NomniTitleCertificationResult> {
  const reasons = denialReasons(input)
  if (reasons.length > 0 || !input.title.verifiedOwnerAddress) {
    return {
      schema: 'NEO-NOMNI-TITLE-CERTIFICATE/V1',
      status: 'DENIED',
      asset: 'NOMNI',
      reasons: reasons.length > 0 ? reasons : ['Certification prerequisites were not satisfied.'],
      gateSnapshot: {
        title: input.title.status,
        conflict: input.conflictGate.status,
        encumbrance: input.encumbranceGate.status
      }
    }
  }

  const canonicalPayload = canonicalCertificatePayload(input)
  const digest = await sha256(canonicalPayload)
  const sourceUrls = stableUnique([
    ...input.title.instruments.flatMap(instrument => instrument.sourceUrls),
    ...input.encumbranceGate.activeInterests.flatMap(interest => interest.sourceUrls),
    ...input.encumbranceGate.releasedInterests.flatMap(interest => interest.sourceUrls)
  ])

  return {
    schema: 'NEO-NOMNI-TITLE-CERTIFICATE/V1',
    certificateId: `NOMNI-SHA256-${digest}`,
    status: 'ISSUED',
    certificationClass: 'UNENCUMBERED_DIGITAL_TITLE',
    asset: 'NOMNI',
    issuerAddress: input.title.issuerAddress,
    ownerAddress: input.title.verifiedOwnerAddress,
    supply: input.title.supply,
    divisible: false,
    locked: true,
    gateSnapshot: {
      title: 'VERIFIED_TITLE',
      conflict: 'CLEAN',
      encumbrance: 'UNENCUMBERED'
    },
    titleInstrumentIds: stableUnique(input.title.instruments.map(instrument => instrument.eventId)),
    titleTransactionHashes: stableUnique(input.title.instruments.map(instrument => instrument.txHash)),
    activeInterestIds: stableUnique(input.encumbranceGate.activeInterests.map(interest => interest.id)),
    releasedInterestIds: stableUnique(input.encumbranceGate.releasedInterests.map(interest => interest.id)),
    sourceUrls,
    canonicalPayload,
    sha256: digest,
    issuedAt: input.issuedAt ?? new Date().toISOString(),
    disclaimer: 'This certificate records NEO provenance and gate results. It is not a court judgment, legal opinion, governmental title instrument, or guarantee of universal legal recognition.'
  }
}

export const nomniTitleCertificationGateV1 = {
  id: 'NEO-NOMNI-TITLE-CERTIFICATION-GATE',
  version: '1.0.0',
  purpose: 'Issue a cryptographically referential NEO audit certificate only when NOMNI has verified digital title, a clean adversarial title-conflict result, and an unencumbered rights result.',
  principles: [
    'Certification cannot repair or bypass an upstream verification, continuity, conflict, or encumbrance defect.',
    'A denied certification preserves explicit blocking reasons rather than silently degrading standards.',
    'The certificate SHA-256 digest is computed from a deterministic canonical payload, independent of issuance time.',
    'Source URLs, transaction hashes, title instruments, and rights records remain referentially attached to the certificate.',
    'NEO certification is an evidentiary/provenance determination, not a substitute for jurisdiction-specific legal adjudication.'
  ],
  certifyNomniTitle
} as const
