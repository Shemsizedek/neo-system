import type { NomniCanonicalProjectionResult } from './nomniCanonicalStateProjectionGate'
import type { NomniDigitalTitle } from './nomniDigitalTitleRegistry'
import type { NomniTitleConflictGateResult } from './nomniTitleConflictGate'
import type { NomniEncumbranceGateResult } from './nomniEncumbranceRightsGate'
import type { NomniTitleCertificate, NomniTitleCertificationDenial } from './nomniTitleCertificationGate'
import { certifyNomniTitle } from './nomniTitleCertificationGate'
import type { NomniCertificateRevocationRecord } from './nomniCertificateVerificationRevocationGate'
import { supersedeNomniCertificate } from './nomniCertificateVerificationRevocationGate'

export type NomniRecertificationRolloverStatus =
  | 'ROLLED_OVER'
  | 'DENIED'
  | 'REVIEW'

export type NomniRecertificationRolloverResult = {
  status: NomniRecertificationRolloverStatus
  priorCertificateId: string
  successorCertificate?: NomniTitleCertificate
  supersession?: NomniCertificateRevocationRecord
  denial?: NomniTitleCertificationDenial
  reasons: string[]
}

function stableUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export async function recertifyAndRolloverNomniState(input: {
  priorCertificate: NomniTitleCertificate
  projection: NomniCanonicalProjectionResult
  rebuiltTitle: NomniDigitalTitle
  conflictGate: NomniTitleConflictGateResult
  encumbranceGate: NomniEncumbranceGateResult
  issuedAt?: string
  evidenceRefs?: string[]
}): Promise<NomniRecertificationRolloverResult> {
  const reasons: string[] = []

  if (input.projection.status !== 'PROJECTED' || !input.projection.state) {
    reasons.push(`Canonical projection status is ${input.projection.status}; recertification requires PROJECTED state.`)
  }

  const projectedState = input.projection.state
  if (projectedState) {
    if (!projectedState.ownerAddress) reasons.push('Projected canonical state has no owner address.')
    if (input.rebuiltTitle.verifiedOwnerAddress !== projectedState.ownerAddress) {
      reasons.push(`Rebuilt title owner ${input.rebuiltTitle.verifiedOwnerAddress ?? 'UNKNOWN'} does not match projected owner ${projectedState.ownerAddress ?? 'UNKNOWN'}.`)
    }
    if (input.rebuiltTitle.locked !== projectedState.locked) {
      reasons.push(`Rebuilt title lock state ${input.rebuiltTitle.locked} does not match projected lock state ${projectedState.locked}.`)
    }

    const projectedRightIds = Object.keys(projectedState.activeRights).sort()
    const gateRightIds = input.encumbranceGate.activeInterests.map(interest => interest.id).sort()
    if (projectedRightIds.length !== gateRightIds.length || projectedRightIds.some((id, index) => id !== gateRightIds[index])) {
      reasons.push('Encumbrance gate active-interest set does not reconcile with projected canonical rights state.')
    }
  }

  if (input.rebuiltTitle.status !== 'VERIFIED_TITLE') reasons.push(`Rebuilt title status is ${input.rebuiltTitle.status}, not VERIFIED_TITLE.`)
  if (input.conflictGate.status !== 'CLEAN' || !input.conflictGate.cleanTitleEligible) reasons.push(`Title Conflict Gate is ${input.conflictGate.status} or not clean-title eligible.`)
  if (input.encumbranceGate.status !== 'UNENCUMBERED' || !input.encumbranceGate.unencumberedTitleEligible) reasons.push(`Encumbrance & Rights Gate is ${input.encumbranceGate.status} or not unencumbered-title eligible.`)

  if (reasons.length > 0) {
    return {
      status: input.projection.status === 'REVIEW' ? 'REVIEW' : 'DENIED',
      priorCertificateId: input.priorCertificate.certificateId,
      reasons: stableUnique(reasons)
    }
  }

  const certification = await certifyNomniTitle({
    title: input.rebuiltTitle,
    conflictGate: input.conflictGate,
    encumbranceGate: input.encumbranceGate,
    issuedAt: input.issuedAt
  })

  if (certification.status === 'DENIED') {
    return {
      status: 'DENIED',
      priorCertificateId: input.priorCertificate.certificateId,
      denial: certification,
      reasons: stableUnique(['Successor title certification was denied.', ...certification.reasons])
    }
  }

  if (certification.certificateId === input.priorCertificate.certificateId) {
    return {
      status: 'REVIEW',
      priorCertificateId: input.priorCertificate.certificateId,
      successorCertificate: certification,
      reasons: ['Projected state produced the same certificate identifier as the prior certificate; no substantive certifiable-state rollover is established.']
    }
  }

  const supersession = supersedeNomniCertificate({
    priorCertificate: input.priorCertificate,
    replacementCertificate: certification,
    explanation: `Superseded after canonical NOMNI state projection and successful recertification to ${certification.certificateId}.`,
    effectiveAt: certification.issuedAt,
    evidenceRefs: stableUnique([
      ...(input.evidenceRefs ?? []),
      ...(projectedState?.provenanceRefs ?? []),
      ...certification.sourceUrls
    ])
  })

  return {
    status: 'ROLLED_OVER',
    priorCertificateId: input.priorCertificate.certificateId,
    successorCertificate: certification,
    supersession,
    reasons: ['Projected canonical state reconciles with rebuilt title, conflict, and encumbrance state; successor certificate issued and prior certificate superseded.']
  }
}

export const nomniStateRecertificationRolloverGateV1 = {
  id: 'NEO-NOMNI-STATE-RECERTIFICATION-ROLLOVER-GATE',
  version: '1.0.0',
  purpose: 'Recertify a successfully projected NOMNI canonical state and roll title certification forward through an explicit, auditable certificate supersession link.',
  principles: [
    'Canonical projection does not itself create a new certificate.',
    'Projected owner, lock state, and active rights must reconcile with rebuilt title and encumbrance state before certification.',
    'Successor certification must independently satisfy verified-title, clean-conflict, and unencumbered-rights requirements.',
    'A prior certificate is superseded only after a distinct successor certificate has actually been issued.',
    'Certificate rollover is append-only: prior certificates remain auditable and are never silently overwritten.',
    'Denied or review-state recertification leaves the prior certificate history intact and records blocking reasons.'
  ],
  recertifyAndRolloverNomniState
} as const
